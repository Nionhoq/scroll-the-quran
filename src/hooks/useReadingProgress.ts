import { useCallback, useState } from "react";

const POSITION_KEY = "scroll-quran:last-read";
const DAYS_KEY = "scroll-quran:reading-days";
const POSITIONS_KEY = "scroll-quran:positions";

export type LastRead = { chapterId: number; verseKey: string };

function readPosition(): LastRead | null {
  try {
    const value = localStorage.getItem(POSITION_KEY);
    return value ? (JSON.parse(value) as LastRead) : null;
  } catch {
    return null;
  }
}

/** Last ayah read in each surah (surah number -> ayah number). Stays on this device only. */
export type Positions = Record<string, number>;

export function readPositions(): Positions {
  try {
    const value = JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? "{}") as unknown;
    return value && typeof value === "object" ? (value as Positions) : {};
  } catch {
    return {};
  }
}

/** Where to reopen a surah: the saved ayah, or the start if it was finished or never opened. */
export function resumeAyah(positions: Positions, chapterId: number, versesCount: number): number {
  const saved = positions[String(chapterId)];
  if (!Number.isInteger(saved) || saved < 1 || saved >= versesCount) return 1;
  return saved;
}

export function localDay(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readingDays(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DAYS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function calculateStreak(days: string[]): number {
  const uniqueDays = new Set(days);
  let streak = 0;
  const cursor = new Date();
  if (!uniqueDays.has(localDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (uniqueDays.has(localDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useReadingProgress() {
  const [lastRead, setLastRead] = useState<LastRead | null>(readPosition);
  const [positions, setPositions] = useState<Positions>(readPositions);
  const [streak, setStreak] = useState(() => calculateStreak(readingDays()));

  const recordRead = useCallback((chapterId: number, verseKey: string) => {
    const nextPosition = { chapterId, verseKey };
    localStorage.setItem(POSITION_KEY, JSON.stringify(nextPosition));
    setLastRead(nextPosition);
    const ayah = Number(verseKey.split(":")[1]);
    setPositions((current) => {
      if (current[String(chapterId)] === ayah) return current;
      const next = { ...current, [String(chapterId)]: ayah };
      try {
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(next));
      } catch {
        // Storage full or blocked: resume simply falls back to the start.
      }
      return next;
    });

    const today = localDay();
    const days = readingDays();
    if (!days.includes(today)) {
      const nextDays = [...days, today].slice(-400);
      localStorage.setItem(DAYS_KEY, JSON.stringify(nextDays));
      setStreak(calculateStreak(nextDays));
    }
  }, []);

  return { lastRead, positions, streak, recordRead };
}
