import type { Context, Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";
import { env } from "./env";
import { buildPreview, injectHead, parsePreviewPath, type Preview } from "./ogMeta";
import { loadSurah, versesCountLookup } from "./quranData";

type App = Hono<{ Bindings: HttpBindings }>;

/** App pages served as index.html (the React router takes over in the browser). */
const PAGE = /^\/(?:|index\.html|privacy|feel|\d{1,3}(?:\/\d{1,3})?)\/?$/;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");
  let template: string | null = null;
  const indexHtml = () => (template ??= fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8"));

  async function previewFor(c: Context): Promise<Preview | null> {
    const target = parsePreviewPath(c.req.path, await versesCountLookup());
    if (!target) return null;
    const feed = await loadSurah(target.surah);
    const verse = target.ayah ? feed.verses[target.ayah - 1] : undefined;
    return buildPreview({
      origin: env.publicOrigin || new URL(c.req.url).origin,
      surah: target.surah,
      ayah: target.ayah,
      chapterName: feed.chapter.nameSimple,
      translatedName: feed.chapter.translatedName,
      versesCount: feed.chapter.versesCount,
      translation: verse?.translation,
    });
  }

  async function page(c: Context) {
    const html = injectHead(indexHtml(), { supportUrl: env.supportUrl, preview: await previewFor(c) });
    return c.html(html, 200, { "Cache-Control": "no-cache" });
  }

  // Known pages first, so "/" and shared links get runtime config and preview tags.
  app.get("*", async (c, next) => (PAGE.test(c.req.path) ? page(c) : next()));
  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) return c.json({ error: "Not Found" }, 404);
    return page(c);
  });
}
