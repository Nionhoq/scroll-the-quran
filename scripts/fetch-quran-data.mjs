import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const API = "https://api.quran.com/api/v4";
const TRANSLATION_ID = "20";
const RECITER_ID = "7";
const root = process.cwd();
const output = path.join(root, "public", "data");
const refresh = !process.argv.includes("--if-missing");

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url, attempt = 1) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (attempt >= 4) throw new Error(`${url}: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    return fetchJson(url, attempt + 1);
  }
}

function decodeEntities(value) {
  const entities = {
    "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&#039;": "'",
    "&apos;": "'", "&lt;": "<", "&gt;": ">", "&mdash;": "—", "&ndash;": "–",
  };
  let text = value;
  for (const [entity, replacement] of Object.entries(entities)) {
    text = text.replaceAll(entity, replacement);
  }
  return text.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function plainText(html) {
  return decodeEntities(
    html
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<\/(?:p|h[1-6]|div|li|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeChapter(raw) {
  return {
    id: raw.id,
    nameSimple: raw.name_simple,
    nameArabic: raw.name_arabic,
    translatedName: raw.translated_name?.name ?? "",
    versesCount: raw.verses_count,
    revelationPlace: raw.revelation_place ?? "",
  };
}

function normalizeVerse(raw) {
  const words = (raw.words ?? [])
    .filter((word) => !["end", "pause", "sajdah"].includes(word.char_type_name))
    .map((word) => ({
      position: word.position,
      // text_qpc_hafs is the encoding the KFGQPC UthmanicHafs font is built for. Using
      // text_uthmani with this font draws placeholder circles on ~36% of ayahs.
      text: word.text_qpc_hafs ?? word.text_uthmani ?? word.text ?? "",
      translation: word.translation?.text ?? "",
      transliteration: word.transliteration?.text ?? null,
    }));
  const file = raw.audio?.url?.match(/(\d{6}\.mp3)(?:\?.*)?$/)?.[1];
  return {
    id: raw.id,
    verseKey: raw.verse_key,
    verseNumber: raw.verse_number,
    // Joined from the sourced words so the end-of-ayah number (shown separately in the UI) is excluded.
    arabic: words.map((word) => word.text).join(" ") || raw.text_qpc_hafs,
    translation: plainText(raw.translations?.[0]?.text ?? ""),
    transliteration: words.map((word) => word.transliteration).filter(Boolean).join(" "),
    audioUrl: file ? `/audio/${RECITER_ID}/${file}` : null,
    segments: raw.audio?.segments ?? [],
    words,
  };
}

function validateFeed(feed) {
  if (!feed?.chapter || !Array.isArray(feed.verses)) throw new Error("Invalid surah data");
  if (feed.verses.length !== feed.chapter.versesCount) {
    throw new Error(`Ayah count mismatch for surah ${feed.chapter.id}`);
  }
  feed.verses.forEach((ayah, index) => {
    const expectedKey = `${feed.chapter.id}:${index + 1}`;
    if (ayah.verseKey !== expectedKey || ayah.verseNumber !== index + 1) {
      throw new Error(`Ayah key mismatch at ${expectedKey}`);
    }
    if (!ayah.arabic || !ayah.translation || !ayah.audioUrl?.startsWith("/audio/7/")) {
      throw new Error(`Incomplete sourced content at ${expectedKey}`);
    }
  });
}

async function mapConcurrent(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

await mkdir(path.join(output, "surah"), { recursive: true });
const chaptersPath = path.join(output, "chapters.json");
const complete = !refresh && (await exists(chaptersPath)) &&
  (await Promise.all(Array.from({ length: 114 }, (_, i) => exists(path.join(output, "surah", `${i + 1}.json`))))).every(Boolean);

if (complete) {
  const chapters = JSON.parse(await readFile(chaptersPath, "utf8"));
  if (chapters.length !== 114) throw new Error("chapters.json must contain 114 surahs");
  for (const chapter of chapters) {
    const feed = JSON.parse(await readFile(path.join(output, "surah", `${chapter.id}.json`), "utf8"));
    validateFeed(feed);
  }
  console.log("Validated static Quran data for all 114 surahs.");
  process.exit(0);
}

const chapterData = await fetchJson(`${API}/chapters?language=en`);
const chapters = chapterData.chapters.map(normalizeChapter);
if (chapters.length !== 114) throw new Error(`Expected 114 surahs, received ${chapters.length}`);
await writeFile(chaptersPath, `${JSON.stringify(chapters)}\n`);

await mapConcurrent(chapters, 4, async (chapter) => {
  const params = new URLSearchParams({
    language: "en",
    words: "true",
    word_fields: "text_qpc_hafs,transliteration,translation",
    translations: TRANSLATION_ID,
    fields: "text_qpc_hafs",
    audio: RECITER_ID,
    per_page: "300",
  });
  const data = await fetchJson(`${API}/verses/by_chapter/${chapter.id}?${params}`);
  const feed = {
    chapter,
    verses: data.verses.map(normalizeVerse),
    source: "Quran.com",
    translationName: "Sahih International",
    reciterName: "Mishary Rashid Alafasy",
  };
  validateFeed(feed);
  await writeFile(path.join(output, "surah", `${chapter.id}.json`), `${JSON.stringify(feed)}\n`);
  console.log(`Saved surah ${chapter.id}/114 (${feed.verses.length} ayahs)`);
});
