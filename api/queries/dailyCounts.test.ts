import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStore, createMemoryStore } from "./dailyCounts";

describe("daily count stores", () => {
  it("file store keeps only day and bucket totals, and survives concurrent pings", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "counts-"));
    const file = path.join(dir, "nested", "counts.json");
    const store = createFileStore(file);
    await Promise.all(Array.from({ length: 25 }, () => store.increment("2026-10-30", "2-7")));
    await store.increment("2026-10-30", "new");
    await store.increment("2026-10-31", "31+");

    expect(await store.read("2026-10-30")).toEqual({ "2-7": 25, new: 1 });
    const raw = JSON.parse(await fs.readFile(file, "utf8"));
    expect(raw).toEqual({ "2026-10-30": { "2-7": 25, new: 1 }, "2026-10-31": { "31+": 1 } });
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("memory store counts per day", async () => {
    const store = createMemoryStore();
    await store.increment("2026-10-30", "1");
    await store.increment("2026-10-30", "1");
    expect(await store.read("2026-10-30")).toEqual({ "1": 2 });
    expect(await store.read("2026-10-29")).toEqual({});
  });
});
