import { useCallback, useState } from "react";

const POSITION_KEY = "scroll-quran:last-read";
const DAYS_KEY = "scroll-quran:reading-days";

export type LastRead = { chapterId: number; verseKey: string };

function readPosition(): LastRead | null {
  try {
    const value = localStorage.getItem(POSITION_KEY);
    return value ? (JSON.parse(value) as LastRead) : null;
  } catch {
    return null;
  }
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
  const [streak, setStreak] = useState(() => calculateStreak(readingDays()));

  const recordRead = useCallback((chapterId: number, verseKey: string) => {
    const nextPosition = { chapterId, verseKey };
    localStorage.setItem(POSITION_KEY, JSON.stringify(nextPosition));
    setLastRead(nextPosition);

    const today = localDay();
    const days = readingDays();
    if (!days.includes(today)) {
      const nextDays = [...days, today].slice(-400);
      localStorage.setItem(DAYS_KEY, JSON.stringify(nextDays));
      setStreak(calculateStreak(nextDays));
    }
  }, []);

  return { lastRead, streak, recordRead };
}
