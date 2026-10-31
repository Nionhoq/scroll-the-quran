import { describe, expect, it } from "vitest";
import chapters from "../../public/data/chapters.json";
import type { Chapter } from "@contracts/quran";
import { parseAyahQuery, searchChapters, spellingKey } from "./surahSearch";

const all = chapters as Chapter[];
const first = (query: string) => searchChapters(all, query)[0]?.id;

describe("surah search", () => {
  it.each([
    ["Yasin", 36],
    ["yaseen", 36],
    ["Ya Sin", 36],
    ["ya-sin", 36],
    ["surah yaseen", 36],
    ["rahman", 55],
    ["rehman", 55],
    ["Ar Rahman", 55],
    ["baqara", 2],
    ["bakara", 2],
    ["al-baqarah", 2],
    ["fatiha", 1],
    ["kahf", 18],
    ["mulk", 67],
    ["taubah", 9],
    ["tawba", 9],
    ["younus", 10],
    ["yousuf", 12],
    ["ikhlas", 112],
    ["waqia", 56],
    ["muzammil", 73],
    ["imran", 3],
    ["The Cow", 2],
    ["36", 36],
    ["الكهف", 18],
    ["كهف", 18],
  ])("%s finds surah %i first", (query, id) => {
    expect(first(query)).toBe(id);
  });

  it("an empty query lists every surah in order", () => {
    expect(searchChapters(all, "  ")).toHaveLength(114);
  });

  it("nonsense finds nothing", () => {
    expect(searchChapters(all, "zzqxv")).toHaveLength(0);
  });

  it("folds spellings to one key", () => {
    expect(spellingKey("Ya-Sin")).toBe(spellingKey("Yaseen"));
    expect(spellingKey("Al-Baqarah")).toBe(spellingKey("baqara"));
  });
});

describe("jump to ayah", () => {
  it.each([
    ["2:255", 2, 255],
    ["2 255", 2, 255],
    ["2.255", 2, 255],
    ["baqarah 255", 2, 255],
    ["yaseen 1", 36, 1],
    ["Ar-Rahman 13", 55, 13],
    ["kahf:10", 18, 10],
  ])("%s → %i:%i", (query, surah, ayah) => {
    expect(parseAyahQuery(all, query)).toMatchObject({ chapter: { id: surah }, ayah });
  });

  it.each(["2:287", "115:1", "1:0", "kahf", "255", "zzqxv 3"])("%s is not one ayah", (query) => {
    expect(parseAyahQuery(all, query)).toBeNull();
  });
});
