import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Chapter, ChapterFeed } from "@contracts/quran";

/** Reads the same static Quran JSON the browser uses (dist/public/data in production). */
function dataRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), "dist/public/data"),
    path.resolve(process.cwd(), "public/data"),
  ];
  return candidates.find((dir) => existsSync(path.join(dir, "chapters.json"))) ?? candidates[1];
}

let chapters: Promise<Chapter[]> | null = null;
const surahs = new Map<number, Promise<ChapterFeed>>();

export function loadChapters(): Promise<Chapter[]> {
  chapters ??= fs.readFile(path.join(dataRoot(), "chapters.json"), "utf8").then((raw) => JSON.parse(raw) as Chapter[]);
  return chapters;
}

export function loadSurah(id: number): Promise<ChapterFeed> {
  let feed = surahs.get(id);
  if (!feed) {
    feed = fs.readFile(path.join(dataRoot(), "surah", `${id}.json`), "utf8").then((raw) => JSON.parse(raw) as ChapterFeed);
    surahs.set(id, feed);
  }
  return feed;
}

export async function versesCountLookup(): Promise<(surah: number) => number | undefined> {
  const list = await loadChapters();
  const map = new Map(list.map((chapter) => [chapter.id, chapter.versesCount]));
  return (surah) => map.get(surah);
}
