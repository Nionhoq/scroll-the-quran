import { describe, expect, it } from "vitest";
import {
  addCompletedDay,
  anchorLabel,
  daysInWindow,
  gentleStreakLabel,
  isAnchor,
  isAyahComplete,
  isLongAyah,
  localDay,
  nextVerseKey,
} from "./dailyAyah";

const base = { viewedMs: 0, audioEnded: false, drawerOpened: false, wordCount: 8 };

describe("done for today", () => {
  it("counts a full recitation on its own, even for very short ayahs", () => {
    expect(isAyahComplete({ ...base, audioEnded: true, viewedMs: 2_000 })).toBe(true);
  });

  it("needs 5 seconds on screen plus the drawer", () => {
    expect(isAyahComplete({ ...base, drawerOpened: true, viewedMs: 4_999 })).toBe(false);
    expect(isAyahComplete({ ...base, drawerOpened: true, viewedMs: 5_000 })).toBe(true);
    expect(isAyahComplete({ ...base, viewedMs: 60_000 })).toBe(false);
  });

  it("lets long ayahs count after 30 seconds of reading", () => {
    expect(isLongAyah(40)).toBe(false);
    expect(isLongAyah(41)).toBe(true);
    expect(isAyahComplete({ ...base, wordCount: 128, viewedMs: 29_999 })).toBe(false);
    expect(isAyahComplete({ ...base, wordCount: 128, viewedMs: 30_000 })).toBe(true);
    expect(isAyahComplete({ ...base, wordCount: 40, viewedMs: 30_000 })).toBe(false);
  });
});

describe("gentle streak", () => {
  const today = new Date(2026, 9, 30, 9, 0);

  it("counts days in the last week and never resets to zero after one miss", () => {
    const days = ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-28", "2026-10-30"];
    expect(daysInWindow(days, today)).toBe(5);
    expect(daysInWindow(["2026-10-28"], today)).toBe(1);
    expect(daysInWindow(["2026-10-23"], today)).toBe(0);
    expect(gentleStreakLabel(5)).toBe("5 of the last 7 days");
    expect(gentleStreakLabel(0)).toBe("A fresh start today");
  });

  it("adds each day once, sorted, and keeps only the last 400", () => {
    expect(addCompletedDay(["2026-10-29"], "2026-10-29")).toEqual(["2026-10-29"]);
    expect(addCompletedDay(["2026-10-30", "bad", "2026-10-01"], "2026-10-15")).toEqual(["2026-10-01", "2026-10-15", "2026-10-30"]);
    const many = Array.from({ length: 450 }, (_, i) => localDay(new Date(2025, 0, 1 + i)));
    const kept = addCompletedDay(many, localDay(new Date(2026, 9, 30)));
    expect(kept).toHaveLength(400);
    expect(kept.at(-1)).toBe("2026-10-30");
  });

  it("uses the reader's local calendar day, not UTC", () => {
    expect(localDay(new Date(2026, 9, 30, 23, 59))).toBe("2026-10-30");
    expect(localDay(new Date(2026, 9, 31, 0, 1))).toBe("2026-10-31");
  });
});

describe("sequential journey", () => {
  const counts: Record<number, number> = { 1: 7, 2: 286, 114: 6 };
  const lookup = (chapter: number) => counts[chapter];

  it("moves to the next ayah, then the next surah, then wraps after An-Nas", () => {
    expect(nextVerseKey("1:3", lookup)).toBe("1:4");
    expect(nextVerseKey("1:7", lookup)).toBe("2:1");
    expect(nextVerseKey("114:6", lookup)).toBe("1:1");
  });

  it("rejects malformed or unknown keys", () => {
    expect(nextVerseKey("abc", lookup)).toBeNull();
    expect(nextVerseKey("50:1", lookup)).toBeNull();
  });
});

describe("anchor", () => {
  it("validates and labels anchors", () => {
    expect(isAnchor("after-fajr")).toBe(true);
    expect(isAnchor("midnight")).toBe(false);
    expect(anchorLabel("after-fajr")).toBe("After Fajr");
    expect(anchorLabel(null)).toBeNull();
  });
});
