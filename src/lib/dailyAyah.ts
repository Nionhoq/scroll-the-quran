/**
 * Daily Ayah habit — pure logic, no React, no storage. Everything here stays on the device.
 */

export const LONG_AYAH_WORDS = 40;
export const MIN_VIEW_MS = 5_000;
export const LONG_AYAH_READ_MS = 30_000;
export const MAX_STORED_DAYS = 400;

export type Engagement = {
  /** Time the ayah has been on screen while the page was visible. */
  viewedMs: number;
  /** Recitation for this ayah played to the end. */
  audioEnded: boolean;
  /** Translation/tafsir drawer opened for this ayah. */
  drawerOpened: boolean;
  /** Number of Arabic words in the ayah. */
  wordCount: number;
};

export type Anchor = "after-fajr" | "morning" | "evening" | "before-sleep";

export const ANCHORS: Array<{ value: Anchor; label: string }> = [
  { value: "after-fajr", label: "After Fajr" },
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "before-sleep", label: "Before sleep" },
];

export function isLongAyah(wordCount: number): boolean {
  return wordCount > LONG_AYAH_WORDS;
}

/**
 * "Done for today":
 * - listening to the full recitation counts on its own (that is real engagement, and very
 *   short ayahs finish before 5 seconds);
 * - otherwise at least 5 s on screen plus opening the translation/tafsir drawer;
 * - long ayahs (over 40 words) also count after 30 s of reading.
 */
export function isAyahComplete(e: Engagement): boolean {
  if (e.audioEnded) return true;
  if (e.drawerOpened && e.viewedMs >= MIN_VIEW_MS) return true;
  if (isLongAyah(e.wordCount) && e.viewedMs >= LONG_AYAH_READ_MS) return true;
  return false;
}

/** Local calendar day, e.g. 2026-10-30, in the reader's own timezone. */
export function localDay(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Adds a day once, keeps the list sorted and trimmed to the most recent 400 days. */
export function addCompletedDay(days: readonly string[], day: string): string[] {
  const unique = new Set(days.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)));
  unique.add(day);
  return [...unique].sort().slice(-MAX_STORED_DAYS);
}

/**
 * Gentle streak: how many of the last `window` days (including today) had a completed ayah.
 * Missing a day lowers the count a little; it never resets to zero.
 */
export function daysInWindow(days: readonly string[], today = new Date(), window = 7): number {
  const set = new Set(days);
  const cursor = new Date(today);
  let count = 0;
  for (let i = 0; i < window; i += 1) {
    if (set.has(localDay(cursor))) count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function gentleStreakLabel(count: number, window = 7): string {
  if (count === 0) return "A fresh start today";
  return `${count} of the last ${window} days`;
}

/** Verse key after `verseKey`, wrapping from the end of a surah to the next, and 114 back to 1. */
export function nextVerseKey(verseKey: string, versesCount: (chapter: number) => number | undefined): string | null {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(verseKey);
  if (!match) return null;
  const chapter = Number(match[1]);
  const verse = Number(match[2]);
  const count = versesCount(chapter);
  if (!count || chapter < 1 || chapter > 114) return null;
  if (verse < count) return `${chapter}:${verse + 1}`;
  return chapter === 114 ? "1:1" : `${chapter + 1}:1`;
}

export function isAnchor(value: unknown): value is Anchor {
  return ANCHORS.some((anchor) => anchor.value === value);
}

export function anchorLabel(anchor: Anchor | null): string | null {
  return ANCHORS.find((item) => item.value === anchor)?.label ?? null;
}
