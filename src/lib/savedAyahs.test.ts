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
    expect(toggleSaved("40:38")).toBe(true);
    expect(isSaved("40:38")).toBe(true);
    expect(toggleSaved("40:38")).toBe(false);
    expect(getSaved()).toEqual([]);
  });

  it("survives a reload", () => {
    toggleSaved("2:255");
    resetSavedCache();
    expect(getSaved()).toEqual(["2:255"]);
  });

  it("ignores ayahs that do not exist and junk in storage", () => {
    expect(toggleSaved("2:287")).toBe(false);
    expect(toggleSaved("115:1")).toBe(false);
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

  it("caps the list", () => {
    for (let a = 1; a <= SAVED_MAX + 5; a += 1) toggleSaved(`2:${a}`);
    expect(getSaved()).toHaveLength(SAVED_MAX);
    expect(getSaved().at(-1)).toBe(`2:${SAVED_MAX + 5}`);
  });
});
