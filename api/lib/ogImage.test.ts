import { describe, expect, it } from "vitest";
import { wrapWords } from "./ogImage";

const measure = (text: string) => text.length * 10;

describe("preview text wrapping", () => {
  it("fits words on lines without losing any when there is room", () => {
    const out = wrapWords("one two three four five".split(" "), 100, 3, measure);
    expect(out.truncated).toBe(false);
    expect(out.lines.join(" ")).toBe("one two three four five");
    for (const line of out.lines) expect(measure(line)).toBeLessThanOrEqual(100);
  });

  it("marks truncation with an ellipsis when lines run out", () => {
    const out = wrapWords("alpha beta gamma delta epsilon zeta eta theta".split(" "), 110, 2, measure);
    expect(out.truncated).toBe(true);
    expect(out.lines).toHaveLength(2);
    expect(out.lines[1].endsWith(" …")).toBe(true);
    expect(measure(out.lines[1])).toBeLessThanOrEqual(110);
  });

  it("can leave the ellipsis to the caller (Arabic font has none)", () => {
    const out = wrapWords("a b c d e f g h".split(" "), 30, 1, measure, false);
    expect(out.truncated).toBe(true);
    expect(out.lines[0]).not.toContain("…");
  });
});
