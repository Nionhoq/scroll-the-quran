import type { Chapter, ChapterFeed } from "@contracts/quran";
import { IS_PREVIEW, previewManifest } from "@/lib/preview";

const DATA = `${import.meta.env.BASE_URL}data`;

async function fetchStaticJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Quran data unavailable (${response.status})`);
  if ("caches" in window && !IS_PREVIEW) {
    const copy = response.clone();
    void caches.open("scroll-quran-v4-data")
      .then((cache) => cache.put(url, copy))
      .catch(() => {
        // The network response remains usable when Cache Storage is unavailable.
      });
  }
  return response.json() as Promise<T>;
}

export function getStaticChapters(): Promise<Chapter[]> {
  return fetchStaticJson<Chapter[]>(`${DATA}/chapters.json`);
}

export async function getStaticChapter(chapterId: number): Promise<ChapterFeed> {
  const feed = await fetchStaticJson<ChapterFeed>(`${DATA}/surah/${chapterId}.json`);
  if (!IS_PREVIEW) return feed;
  // Preview: only bundled recitations play; the rest show as unavailable.
  const { audio } = await previewManifest();
  const bundled = new Set(audio);
  return {
    ...feed,
    verses: feed.verses.map((verse) => {
      const file = verse.audioUrl?.split("/").pop() ?? "";
      return { ...verse, audioUrl: bundled.has(file) ? `./preview/audio/${file}` : null };
    }),
  };
}
