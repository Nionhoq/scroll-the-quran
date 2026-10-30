import { createRouter, publicQuery } from "./middleware";
import { quranRouter } from "./quranRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  quran: quranRouter,
});

export type AppRouter = typeof appRouter;
