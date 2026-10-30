import { Hono } from "hono";
import { getTafsir } from "../quranService";
import { log } from "../lib/logger";

export const tafsirRoutes = new Hono();

tafsirRoutes.get("/:verseKey", async (c) => {
  const verseKey = c.req.param("verseKey");
  if (!/^\d{1,3}:\d{1,3}$/.test(verseKey)) {
    return c.json({ error: "Invalid ayah" }, 400);
  }
  try {
    const excerpt = await getTafsir(verseKey);
    return c.json(excerpt, 200, {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    });
  } catch (error) {
    log.error("tafsir request failed", {
      verseKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ error: "Tafsir unavailable" }, 502);
  }
});
