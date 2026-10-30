import { createServerClient } from "@quranjs/api/server";
import type { ChapterId, VerseKey } from "@quranjs/api";
import type {
  Ayah,
  AudioSegment,
  Chapter,
  ChapterFeed,
  QuranSource,
  TafsirExcerpt,
} from "@contracts/quran";
import { log } from "./lib/logger";
import { makeExcerpt, plainText } from "./lib/tafsirText";

const LEGACY_API = "https://api.quran.com/api/v4";
const TRANSLATION_ID = "20"; // Sahih International
const RECITER_ID = "7"; // Mishary Rashid Alafasy
const TAFSIR_ID = "169"; // Ibn Kathir (Abridged), English

const hasFoundationCredentials = Boolean(
  process.env.QF_CLIENT_ID && process.env.QF_CLIENT_SECRET,
);

let foundationClient: ReturnType<typeof createServerClient> | null = null;

function getFoundationClient() {
  if (!hasFoundationCredentials) return null;
  if (foundationClient) return foundationClient;

  const isPrelive = process.env.QF_ENV !== "production";
  foundationClient = createServerClient({
    clientId: process.env.QF_CLIENT_ID!,
    clientSecret: process.env.QF_CLIENT_SECRET!,
    services: isPrelive
      ? {
          gatewayUrl: "https://apis-prelive.quran.foundation",
          oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
        }
      : undefined,
  });
  return foundationClient;
}

type RawChapter = {
  id: number;
  name_simple?: string;
  nameSimple?: string;
  name_arabic?: string;
  nameArabic?: string;
  verses_count?: number;
  versesCount?: number;
  revelation_place?: string;
  revelationPlace?: string;
  translated_name?: { name?: string };
  translatedName?: { name?: string };
};

type RawWord = {
  position: number;
  char_type_name?: string;
  charTypeName?: string;
  text?: string;
  text_uthmani?: string;
  textUthmani?: string;
  translation?: { text?: string };
  transliteration?: { text?: string | null };
};

type RawVerse = {
  id: number;
  verse_number?: number;
  verseNumber?: number;
  verse_key: string;
  text_uthmani?: string;
  textUthmani?: string;
  words?: RawWord[];
  translations?: Array<{ text?: string }>;
  tafsirs?: Array<{
    text?: string;
    resource_name?: string;
    resourceName?: string;
  }>;
  audio?: {
    url?: string;
    audioUrl?: string;
    segments?: AudioSegment[];
  };
};

type TimedCache = { chapters?: { value: Chapter[]; expires: number } };
const cache: TimedCache = {};

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Quran data request failed (${response.status})`);
  return response.json();
}

function normalizeChapter(raw: RawChapter): Chapter {
  return {
    id: raw.id,
    nameSimple: raw.name_simple ?? raw.nameSimple ?? `Surah ${raw.id}`,
    nameArabic: raw.name_arabic ?? raw.nameArabic ?? "",
    translatedName:
      raw.translated_name?.name ?? raw.translatedName?.name ?? "",
    versesCount: raw.verses_count ?? raw.versesCount ?? 0,
    revelationPlace: raw.revelation_place ?? raw.revelationPlace ?? "",
  };
}

function proxyAudioUrl(url?: string): string | null {
  if (!url) return null;
  const file = url.match(/(\d{6}\.mp3)(?:\?.*)?$/)?.[1];
  return file ? `/audio/${RECITER_ID}/${file}` : null;
}

function normalizeVerse(raw: RawVerse): Ayah {
  const words = (raw.words ?? [])
    .filter((word) => {
      const type = word.char_type_name ?? word.charTypeName;
      return type !== "end" && type !== "pause" && type !== "sajdah";
    })
    .map((word) => ({
      position: word.position,
      text: word.text_uthmani ?? word.textUthmani ?? word.text ?? "",
      translation: word.translation?.text ?? "",
      transliteration: word.transliteration?.text ?? null,
    }));

  const arabic =
    raw.text_uthmani ??
    raw.textUthmani ??
    words.map((word) => word.text).join(" ");

  return {
    id: raw.id,
    verseKey: raw.verse_key,
    verseNumber: raw.verse_number ?? raw.verseNumber ?? 0,
    arabic,
    translation: plainText(raw.translations?.[0]?.text ?? ""),
    transliteration: words
      .map((word) => word.transliteration)
      .filter(Boolean)
      .join(" "),
    audioUrl: proxyAudioUrl(raw.audio?.audioUrl ?? raw.audio?.url),
    segments: raw.audio?.segments ?? [],
    words,
  };
}

async function legacyChapters(): Promise<Chapter[]> {
  const data = (await fetchJson(`${LEGACY_API}/chapters?language=en`)) as {
    chapters: RawChapter[];
  };
  return data.chapters.map(normalizeChapter);
}

export async function getChapters(): Promise<Chapter[]> {
  if (cache.chapters && cache.chapters.expires > Date.now()) {
    return cache.chapters.value;
  }

  const client = getFoundationClient();
  let chapters: Chapter[];
  if (client) {
    try {
      const rows = (await client.content.v4.chapters.list()) as unknown as RawChapter[];
      chapters = rows.map(normalizeChapter);
    } catch (error) {
      log.warn("Quran Foundation chapters unavailable; using Quran.com fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      chapters = await legacyChapters();
    }
  } else {
    chapters = await legacyChapters();
  }

  cache.chapters = { value: chapters, expires: Date.now() + 60 * 60 * 1000 };
  return chapters;
}

async function foundationVerses(chapterId: number): Promise<Ayah[]> {
  const client = getFoundationClient();
  if (!client) throw new Error("Quran Foundation is not configured");
  const rows = (await client.content.v4.verses.byChapter(String(chapterId) as ChapterId, {
    language: "en",
    words: true,
    word_fields: "text_uthmani,transliteration,translation",
    translations: TRANSLATION_ID,
    fields: "text_uthmani",
    audio: RECITER_ID,
    per_page: 300,
  })) as unknown as RawVerse[];
  return rows.map(normalizeVerse);
}

async function legacyVerses(chapterId: number): Promise<Ayah[]> {
  const params = new URLSearchParams({
    language: "en",
    words: "true",
    word_fields: "text_uthmani,transliteration,translation",
    translations: TRANSLATION_ID,
    fields: "text_uthmani",
    audio: RECITER_ID,
    per_page: "300",
  });
  const data = (await fetchJson(
    `${LEGACY_API}/verses/by_chapter/${chapterId}?${params}`,
  )) as { verses: RawVerse[] };
  return data.verses.map(normalizeVerse);
}

export async function getChapterFeed(chapterId: number): Promise<ChapterFeed> {
  const chapters = await getChapters();
  const chapter = chapters.find((item) => item.id === chapterId);
  if (!chapter) throw new Error("Surah not found");

  let verses: Ayah[];
  let source: QuranSource = "Quran Foundation";
  try {
    verses = await foundationVerses(chapterId);
    if (!verses.length) throw new Error("No verses returned");
  } catch (error) {
    if (hasFoundationCredentials) {
      log.warn("Quran Foundation verses unavailable; using Quran.com fallback", {
        chapterId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    verses = await legacyVerses(chapterId);
    source = "Quran.com";
  }

  return {
    chapter,
    verses,
    source,
    translationName: "Sahih International",
    reciterName: "Mishary Rashid Alafasy",
  };
}

export async function getTafsir(verseKey: string): Promise<TafsirExcerpt> {
  const client = getFoundationClient();
  if (client) {
    try {
      const verse = (await client.content.v4.verses.byKey(verseKey as VerseKey, {
        tafsirs: TAFSIR_ID,
      })) as unknown as RawVerse;
      const text = verse.tafsirs?.[0]?.text;
      if (text) return makeExcerpt(verseKey, text, "Quran Foundation");
    } catch (error) {
      log.warn("Quran Foundation tafsir unavailable; using Quran.com fallback", {
        verseKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const data = (await fetchJson(
    `${LEGACY_API}/tafsirs/${TAFSIR_ID}/by_ayah/${verseKey}`,
  )) as { tafsir?: { text?: string } };
  if (!data.tafsir?.text) throw new Error("Tafsir is unavailable for this ayah");
  return makeExcerpt(verseKey, data.tafsir.text, "Quran.com");
}
