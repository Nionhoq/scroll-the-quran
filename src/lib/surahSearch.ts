import type { Chapter } from "@contracts/quran";

/**
 * Forgiving surah search. People type surah names the way they hear them: "Yaseen", "Yasin",
 * "Ya Sin", "surah rehman", "baqara", "taubah". We fold common transliteration variants to one
 * spelling key, then fall back to edit distance for small typos.
 */

const ARTICLE = /^(?:al|an|ar|as|at|ad|az|ash|adh|ath|aj|el)[-\s]+/;

export function spellingKey(input: string): string {
  let s = input.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  s = s.replace(/^(?:surah|surat|sura|soorah|surah-)\s*/, "");
  s = s.replace(ARTICLE, "");
  s = s.replace(/[^a-z0-9]/g, "");
  s = s
    .replace(/ee|ie|ei|ey/g, "i")
    .replace(/oo|ou/g, "u")
    .replace(/aw/g, "au")
    .replace(/q/g, "k")
    .replace(/e/g, "a")
    .replace(/(.)\1+/g, "$1")
    .replace(/h$/, "");
  return s;
}

function arabicKey(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[ً-ٰٟۖ-ۭ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^ال/, "")
    .replace(/\s+/g, "");
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

/** Lower is better; null means no match. */
export function matchScore(chapter: Chapter, query: string): number | null {
  const raw = query.trim().toLowerCase();
  if (!raw) return 0;
  if (/^\d{1,3}$/.test(raw)) return Number(raw) === chapter.id ? 0 : null;

  if (/[؀-ۿ]/.test(raw)) {
    const q = arabicKey(raw);
    const name = arabicKey(chapter.nameArabic);
    if (name === q) return 1;
    if (name.startsWith(q)) return 2;
    return name.includes(q) ? 3 : null;
  }

  const q = spellingKey(raw);
  if (!q) return null;
  const name = spellingKey(chapter.nameSimple);
  if (name === q) return 1;
  if (name.startsWith(q)) return 2;
  if (name.includes(q)) return 3;
  if (chapter.translatedName.toLowerCase().includes(raw)) return 4;
  if (q.length >= 3) {
    const allowed = q.length >= 7 ? 2 : 1;
    if (editDistance(name, q) <= allowed) return 5;
    // Partly typed: compare against the start of the name.
    if (q.length >= 4 && q.length < name.length && editDistance(name.slice(0, q.length), q) <= 1) return 6;
  }
  return null;
}

export function searchChapters(chapters: Chapter[], query: string): Chapter[] {
  if (!query.trim()) return chapters;
  return chapters
    .map((chapter) => ({ chapter, score: matchScore(chapter, query) }))
    .filter((item): item is { chapter: Chapter; score: number } => item.score !== null)
    .sort((a, b) => a.score - b.score || a.chapter.id - b.chapter.id)
    .map((item) => item.chapter);
}

export type AyahTarget = { chapter: Chapter; ayah: number };

/**
 * Recognises a specific ayah: "2:255", "2 255", "2.255", "baqarah 255", "yasin 1".
 * Returns null when the query does not name one valid ayah.
 */
export function parseAyahQuery(chapters: Chapter[], query: string): AyahTarget | null {
  const raw = query.trim();
  const numeric = /^(\d{1,3})\s*[:.\s/-]\s*(\d{1,3})$/.exec(raw);
  let chapter: Chapter | undefined;
  let ayah: number;
  if (numeric) {
    chapter = chapters.find((item) => item.id === Number(numeric[1]));
    ayah = Number(numeric[2]);
  } else {
    const named = /^(.*\D)\s*[:\s]\s*(\d{1,3})$/.exec(raw);
    if (!named || !named[1].trim()) return null;
    chapter = searchChapters(chapters, named[1]).find((item) => (matchScore(item, named[1]) ?? 9) <= 5);
    ayah = Number(named[2]);
  }
  if (!chapter || ayah < 1 || ayah > chapter.versesCount) return null;
  return { chapter, ayah };
}
