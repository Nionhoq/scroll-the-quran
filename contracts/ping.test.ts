import { describe, expect, it } from "vitest";
import { getPingBucket } from "./ping";

describe("getPingBucket", () => {
  it("groups every supported reading streak without identifying the reader", () => {
    expect(getPingBucket(0)).toBe("new");
    expect(getPingBucket(-1)).toBe("new");
    expect(getPingBucket(Number.NaN)).toBe("new");
    expect(getPingBucket(1)).toBe("1");
    expect(getPingBucket(2)).toBe("2-7");
    expect(getPingBucket(7)).toBe("2-7");
    expect(getPingBucket(8)).toBe("8-30");
    expect(getPingBucket(30)).toBe("8-30");
    expect(getPingBucket(31)).toBe("31+");
    expect(getPingBucket(400)).toBe("31+");
  });
});
