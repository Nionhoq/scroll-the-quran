import { beforeEach, describe, expect, it } from "vitest";

// Minimal in-memory localStorage (tests run in Node, without a browser DOM).
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
} as Storage;
import { getSaved, isSaved, removeSaved, resetSavedCache, SAVED_MAX, toggleSaved } from "./savedAyahs";

beforeEach(() => {
  localStorage.clear();
  resetSavedCache();
});

describe("saved ayahs", () => {
  it("keeps saved ayahs in the order they were saved", () => {
    toggleSaved("2:255");
    toggleSaved("2:285");
    toggleSaved("3:196");
    expect(getSaved()).toEqual(["2:255", "2:285", "3:196"]);
  });

  it("toggling again removes it", () => {
    expect(toggleSaved("40:38")).toBe("saved");
    expect(isSaved("40:38")).toBe(true);
    expect(toggleSaved("40:38")).toBe("removed");
    expect(getSaved()).toEqual([]);
  });

  it("survives a reload", () => {
    toggleSaved("2:255");
    resetSavedCache();
    expect(getSaved()).toEqual(["2:255"]);
  });

  it("ignores ayahs that do not exist and junk in storage", () => {
    expect(toggleSaved("2:287")).toBe("invalid");
    expect(toggleSaved("115:1")).toBe("invalid");
    localStorage.setItem("scroll-quran:saved", JSON.stringify(["1:1", "1:1", "x", 5, "1:8", "36:1"]));
    resetSavedCache();
    expect(getSaved()).toEqual(["1:1", "36:1"]);
    localStorage.setItem("scroll-quran:saved", "{not json");
    resetSavedCache();
    expect(getSaved()).toEqual([]);
  });

  it("removes one without touching the rest", () => {
    toggleSaved("2:255");
    toggleSaved("2:285");
    removeSaved("2:255");
    expect(getSaved()).toEqual(["2:285"]);
  });

  it("a full list refuses new ones and never drops the oldest", () => {
    for (let a = 1; a <= SAVED_MAX; a += 1) expect(toggleSaved(`2:${a}`)).toBe("saved");
    expect(toggleSaved("2:255")).toBe("full");
    expect(getSaved()).toHaveLength(SAVED_MAX);
    expect(getSaved()[0]).toBe("2:1");
    expect(getSaved()).not.toContain("2:255");
    // Removing one makes room again.
    expect(toggleSaved("2:1")).toBe("removed");
    expect(toggleSaved("2:255")).toBe("saved");
  });
});
