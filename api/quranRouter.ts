import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getChapterFeed, getChapters, getTafsir } from "./quranService";

export const quranRouter = createRouter({
  chapters: publicQuery.query(() => getChapters()),
  chapter: publicQuery
    .input(z.object({ chapterId: z.number().int().min(1).max(114) }))
    .query(({ input }) => getChapterFeed(input.chapterId)),
  tafsir: publicQuery
    .input(z.object({ verseKey: z.string().regex(/^\d{1,3}:\d{1,3}$/) }))
    .query(({ input }) => getTafsir(input.verseKey)),
});
