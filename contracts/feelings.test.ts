import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import feelings from "../src/data/feelings.json";
import { validateFeelings, type FeelingsFile } from "./feelings";

const chapters = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "../public/data/chapters.json"), "utf8"),
) as Array<{ id: number; versesCount: number }>;
const counts = new Map(chapters.map((chapter) => [chapter.id, chapter.versesCount]));
const lookup = (surah: number) => counts.get(surah);

describe("feelings.json", () => {
  it("covers all 8 feelings with 3-7 real, existing verses each", () => {
    expect(validateFeelings(feelings as FeelingsFile, lookup)).toEqual([]);
  });

  it("is marked as pending scholar review until signed off", () => {
    expect((feelings as FeelingsFile).reviewStatus).toBe("pending-scholar-review");
  });

  it("catches bad entries", () => {
    const bad: FeelingsFile = {
      reviewStatus: "x",
      feelings: [{ id: "stressed", label: "Stressed", verses: ["13:28", "13:99", "999:1", "13:28"] }],
    };
    const problems = validateFeelings(bad, lookup);
    expect(problems).toContain("stressed: 13:99 is not a valid verse");
    expect(problems).toContain("stressed: 999:1 is not a valid verse");
    expect(problems).toContain("stressed: duplicate verse");
    expect(problems).toContain("missing feeling: anxious");
  });
});
