import { useCallback, useEffect, useRef, useState } from "react";
import type { Ayah } from "@contracts/quran";
import {
  addCompletedDay,
  daysInWindow,
  isAnchor,
  isAyahComplete,
  localDay,
  type Anchor,
} from "@/lib/dailyAyah";

// All of this stays in this browser. None of it is ever sent to the server.
export const COMPLETED_DAYS_KEY = "scroll-quran:completed-days";
export const LAST_COMPLETED_KEY = "scroll-quran:last-completed";
export const ANCHOR_KEY = "scroll-quran:anchor";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private browsing can block storage; the habit simply won't persist.
  }
}

function readDays(): string[] {
  const value = readJson<unknown>(COMPLETED_DAYS_KEY, []);
  return Array.isArray(value) ? value.filter((day): day is string => typeof day === "string") : [];
}

function readAnchor(): Anchor | null {
  try {
    const value = localStorage.getItem(ANCHOR_KEY);
    return isAnchor(value) ? value : null;
  } catch {
    return null;
  }
}

type Tracking = { verseKey: string; viewedMs: number; audioEnded: boolean; drawerOpened: boolean; wordCount: number };

export function useDailyAyah(currentAyah: Ayah | undefined) {
  const [completedDays, setCompletedDays] = useState<string[]>(readDays);
  const [lastCompleted, setLastCompleted] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_COMPLETED_KEY);
    } catch {
      return null;
    }
  });
  const [anchor, setAnchorState] = useState<Anchor | null>(readAnchor);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [today, setToday] = useState(() => localDay());

  const doneToday = completedDays.includes(today);
  const tracking = useRef<Tracking | null>(null);
  const doneRef = useRef(doneToday);
  useEffect(() => {
    doneRef.current = doneToday;
  }, [doneToday]);

  const complete = useCallback((verseKey: string) => {
    const day = localDay();
    write(LAST_COMPLETED_KEY, verseKey);
    setLastCompleted(verseKey);
    if (doneRef.current && day === today) return;
    doneRef.current = true;
    setToday(day);
    setCompletedDays((days) => {
      const next = addCompletedDay(days, day);
      write(COMPLETED_DAYS_KEY, JSON.stringify(next));
      return next;
    });
    setCelebration(verseKey);
  }, [today]);

  const evaluate = useCallback(() => {
    const t = tracking.current;
    if (!t) return;
    if (isAyahComplete(t)) complete(t.verseKey);
  }, [complete]);

  // Start fresh tracking whenever a new ayah becomes current.
  useEffect(() => {
    if (!currentAyah) return;
    tracking.current = {
      verseKey: currentAyah.verseKey,
      viewedMs: 0,
      audioEnded: false,
      drawerOpened: false,
      wordCount: currentAyah.words.length || currentAyah.arabic.split(/\s+/).length,
    };
  }, [currentAyah]);

  // Count visible seconds on the current ayah.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible" || !tracking.current) return;
      tracking.current.viewedMs += 1000;
      evaluate();
      const now = localDay();
      if (now !== today) setToday(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [evaluate, today]);

  const markAudioEnded = useCallback((verseKey: string) => {
    if (tracking.current?.verseKey !== verseKey) return;
    tracking.current.audioEnded = true;
    evaluate();
  }, [evaluate]);

  const markDrawerOpened = useCallback((verseKey: string) => {
    if (tracking.current?.verseKey !== verseKey) return;
    tracking.current.drawerOpened = true;
    evaluate();
  }, [evaluate]);

  const setAnchor = useCallback((value: Anchor | null) => {
    write(ANCHOR_KEY, value);
    setAnchorState(value);
  }, []);

  return {
    doneToday,
    lastCompleted,
    recentDays: daysInWindow(completedDays),
    anchor,
    setAnchor,
    celebration,
    dismissCelebration: useCallback(() => setCelebration(null), []),
    markAudioEnded,
    markDrawerOpened,
  };
}
