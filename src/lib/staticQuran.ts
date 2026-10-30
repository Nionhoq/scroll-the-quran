import type { Chapter, ChapterFeed } from "@contracts/quran";

async function fetchStaticJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Quran data unavailable (${response.status})`);
  if ("caches" in window) {
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
  return fetchStaticJson<Chapter[]>("/data/chapters.json");
}

export function getStaticChapter(chapterId: number): Promise<ChapterFeed> {
  return fetchStaticJson<ChapterFeed>(`/data/surah/${chapterId}.json`);
}
