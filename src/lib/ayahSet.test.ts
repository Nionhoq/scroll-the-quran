import { describe, expect, it } from "vitest";
import feelings from "@/data/feelings.json";
import { parseSetFragment, setFragment, setShareData } from "./ayahSet";

const counts = (surah: number) => ({ 2: 286, 13: 43, 94: 8, 65: 12 })[surah];

describe("shared ayah sets", () => {
  it("round-trips through the fragment", () => {
    const keys = ["13:28", "94:5", "94:6", "65:3"];
    expect(setFragment(keys)).toBe("#set=13-28.94-5.94-6.65-3");
    expect(parseSetFragment(setFragment(keys), counts)).toEqual(keys);
  });

  it.each([
    "",
    "#set=",
    "#set=13-28",
    "#set=13-28.13-28",
    "#set=13-99.94-5",
    "#set=0-1.94-5",
    "#set=115-1.94-5",
    "#set=1-1.1-2.1-3.1-4.1-5.1-6.1-7.2-1",
    "#set=13-28.94-5&x=1",
    "#other=13-28.94-5",
  ])("rejects %s", (hash) => {
    expect(parseSetFragment(hash, counts)).toBeNull();
  });

  it("the link keeps the set in the fragment and never names a feeling", () => {
    const data = setShareData("https://example.org", ["13:28", "94:5", "94:6"], "Verily, in the remembrance of Allah do hearts find rest.");
    const url = new URL(data.url);
    expect(url.pathname).toBe("/13/28");
    expect(url.search).toBe("");
    expect(url.hash).toBe("#set=13-28.94-5.94-6");
    const all = `${data.title} ${data.text} ${data.url}`.toLowerCase();
    for (const feeling of feelings.feelings) {
      expect(all).not.toContain(feeling.id);
      expect(all).not.toContain(feeling.label.toLowerCase());
    }
  });
});

describe("verse counts", () => {
  it("match the bundled Quran data", async () => {
    const { VERSES_PER_SURAH } = await import("./versesCount");
    const chapters = (await import("../../public/data/chapters.json")).default as Array<{ versesCount: number }>;
    expect([...VERSES_PER_SURAH]).toEqual(chapters.map((c) => c.versesCount));
    expect(VERSES_PER_SURAH.reduce((a, b) => a + b, 0)).toBe(6236);
  });
});
