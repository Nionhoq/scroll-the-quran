import { describe, expect, it } from "vitest";
import { ayahPath, shareData, trimText } from "./share";

describe("share links", () => {
  it("contain only the verse key", () => {
    expect(ayahPath("13:28")).toBe("/13/28");
    const data = shareData("https://scrollquran.org", "13:28", "Ar-Ra'd", "Those who have believed and whose hearts are assured by the remembrance of Allāh.");
    expect(data.url).toBe("https://scrollquran.org/13/28");
    expect(data.url).not.toMatch(/[?#]/);
    expect(data.title).toBe("Surah Ar-Ra'd 13:28");
  });

  it("trims long text on a word boundary with an ellipsis", () => {
    expect(trimText("short text")).toBe("short text");
    const long = "word ".repeat(80);
    const trimmed = trimText(long, 150);
    expect(trimmed.length).toBeLessThanOrEqual(150);
    expect(trimmed.endsWith("…")).toBe(true);
    expect(trimmed).not.toMatch(/\s…$/);
  });
});
