import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { renderOgPng } from "../lib/ogImage";
import { loadSurah, versesCountLookup } from "../lib/quranData";
import { log } from "../lib/logger";

const CACHE_DIR = path.resolve(process.env.OG_CACHE_DIR ?? "data/og-cache");
const memory = new Map<string, Uint8Array>();
const MEMORY_MAX = 200;
const inflight = new Map<string, Promise<Uint8Array>>();

async function imageFor(surah: number, ayah: number): Promise<Uint8Array> {
  const key = `${surah}-${ayah}`;
  const hit = memory.get(key);
  if (hit) return hit;
  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      const file = path.join(CACHE_DIR, `${key}.png`);
      try {
        return new Uint8Array(await fs.readFile(file));
      } catch {
        const feed = await loadSurah(surah);
        const verse = feed.verses[ayah - 1];
        const png = await renderOgPng({
          arabic: verse.arabic,
          translation: verse.translation,
          chapterName: feed.chapter.nameSimple,
          verseKey: verse.verseKey,
        });
        await fs.mkdir(CACHE_DIR, { recursive: true }).catch(() => {});
        await fs.writeFile(file, png).catch(() => {});
        return png;
      }
    })().finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  const png = await pending;
  memory.set(key, png);
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value!);
  return png;
}

export const ogRoutes = new Hono();

ogRoutes.get("/:file", async (c) => {
  const match = /^(\d{1,3})-(\d{1,3})\.png$/.exec(c.req.param("file"));
  const count = match ? (await versesCountLookup())(Number(match[1])) : undefined;
  if (!match || !count || Number(match[2]) < 1 || Number(match[2]) > count) {
    return c.json({ error: "Not Found" }, 404);
  }
  try {
    const png = await imageFor(Number(match[1]), Number(match[2]));
    return c.body(png as unknown as ArrayBuffer, 200, {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  } catch (error) {
    log.error("og image failed", { error: error instanceof Error ? error.message : String(error) });
    return c.json({ error: "Preview unavailable" }, 500);
  }
});
