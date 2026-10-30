import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const chapters = JSON.parse(fs.readFileSync(path.join(root, "public/data/chapters.json"), "utf8")) as Array<{ id: number; versesCount: number }>;

describe("Quran text and font pairing", () => {
  it("every character in all 6,236 ayahs has a real glyph in the UthmanicHafs font", async () => {
    const hb = await require("harfbuzzjs");
    const font = fs.readFileSync(path.join(root, "api/assets/fonts/UthmanicHafs.ttf"));
    const face = hb.createFace(hb.createBlob(font), 0);
    const supported = new Set<number>(face.collectUnicodes());
    // In this font, U+06DF and U+06EB are placeholder dotted-circle glyphs: the text must use
    // the font's own encoding (Quran.com text_qpc_hafs), never text_uthmani.
    const placeholders = new Set([0x06df, 0x06eb]);

    let ayahs = 0;
    const problems: string[] = [];
    for (const chapter of chapters) {
      const feed = JSON.parse(fs.readFileSync(path.join(root, `public/data/surah/${chapter.id}.json`), "utf8"));
      expect(feed.verses).toHaveLength(chapter.versesCount);
      for (const verse of feed.verses) {
        ayahs += 1;
        for (const char of verse.arabic as string) {
          const cp = char.codePointAt(0)!;
          if (char === " ") continue;
          if (!supported.has(cp) || placeholders.has(cp)) problems.push(`${verse.verseKey} U+${cp.toString(16).toUpperCase()}`);
        }
        expect(verse.words.map((w: { text: string }) => w.text).join(" ")).toBe(verse.arabic);
      }
    }
    expect(ayahs).toBe(6236);
    expect(problems.slice(0, 10)).toEqual([]);
  }, 30_000);
});
