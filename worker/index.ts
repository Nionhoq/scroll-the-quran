/**
 * Cloudflare Worker for Scroll The Quran.
 * Static files (app, Quran data, fonts) are served by Workers Static Assets; this Worker handles
 * HTML pages (preview tags), the audio proxy, tafsir, the anonymous daily count (D1),
 * share-preview images (R2 cache) and the sitemap. Every response carries the privacy headers.
 */
import { Hono } from "hono";
import { PING_BUCKETS } from "@contracts/ping";
import type { Chapter, ChapterFeed } from "@contracts/quran";
import { buildPreview, injectHead, parsePreviewPath } from "../api/lib/ogMeta";
import { makeExcerpt } from "../api/lib/tafsirText";
import { renderOgPng } from "./ogImage";

export type Env = {
  ASSETS: Fetcher;
  COUNTS?: D1Database;
  OG_CACHE?: R2Bucket;
  PUBLIC_ORIGIN?: string;
  SUPPORT_URL?: string;
};

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "microphone=(), camera=(), geolocation=()",
  "X-Content-Type-Options": "nosniff",
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  headers.delete("Set-Cookie");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const app = new Hono<{ Bindings: Env }>();

function originOf(env: Env, url: string): string {
  return (env.PUBLIC_ORIGIN ?? "").replace(/\/$/, "") || new URL(url).origin;
}

async function asset(env: Env, url: string, path: string): Promise<Response> {
  return env.ASSETS.fetch(new Request(new URL(path, url)));
}

let chaptersCache: Chapter[] | null = null;
async function chapters(env: Env, url: string): Promise<Chapter[]> {
  chaptersCache ??= (await (await asset(env, url, "/data/chapters.json")).json()) as Chapter[];
  return chaptersCache;
}

async function surah(env: Env, url: string, id: number): Promise<ChapterFeed> {
  return (await (await asset(env, url, `/data/surah/${id}.json`)).json()) as ChapterFeed;
}

async function countsLookup(env: Env, url: string) {
  const map = new Map((await chapters(env, url)).map((c) => [c.id, c.versesCount]));
  return (n: number) => map.get(n);
}

// ---- Audio proxy: the browser never contacts the audio host directly. ----
const RECITERS: Record<string, string> = { "7": "Alafasy/mp3" };

app.get("/audio/:reciter/:file", async (c) => {
  const reciter = RECITERS[c.req.param("reciter")];
  const file = c.req.param("file");
  if (!reciter || !/^\d{6}\.mp3$/.test(file)) return c.json({ error: "Audio not found" }, 404);
  const headers = new Headers({ Accept: "audio/mpeg" });
  const range = c.req.header("range");
  if (range) headers.set("Range", range);
  const upstream = await fetch(`https://verses.quran.foundation/${reciter}/${file}`, {
    headers,
    cf: { cacheEverything: true, cacheTtl: 31_536_000 },
  });
  if (!upstream.ok && upstream.status !== 206) {
    return c.json({ error: "Audio unavailable" }, upstream.status === 404 ? 404 : 502);
  }
  const out = new Headers({ "Cache-Control": "public, max-age=31536000, immutable" });
  for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "ETag", "Last-Modified"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  if (!out.has("Content-Type")) out.set("Content-Type", "audio/mpeg");
  if (!out.has("Accept-Ranges")) out.set("Accept-Ranges", "bytes");
  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers: out });
});

// ---- Tafsir (Ibn Kathir abridged, resource 169), unedited excerpt with source link. ----
app.get("/api/tafsir/:verseKey", async (c) => {
  const verseKey = c.req.param("verseKey");
  if (!/^\d{1,3}:\d{1,3}$/.test(verseKey)) return c.json({ error: "Invalid ayah" }, 400);
  const upstream = await fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${verseKey}`, {
    headers: { Accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 86_400 },
  });
  if (!upstream.ok) return c.json({ error: "Tafsir unavailable" }, 502);
  const data = (await upstream.json()) as { tafsir?: { text?: string } };
  if (!data.tafsir?.text) return c.json({ error: "Tafsir unavailable" }, 502);
  return c.json(makeExcerpt(verseKey, data.tafsir.text, "Quran.com"), 200, {
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  });
});

// ---- Anonymous daily count: only (day, bucket) -> total is stored. ----
app.post("/api/ping", async (c) => {
  const raw = await c.req.text();
  if (raw.length > 128) return c.body(null, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return c.json({ error: "Invalid daily count" }, 400);
  }
  const keys = body && typeof body === "object" ? Object.keys(body) : [];
  const bucket = (body as { bucket?: unknown })?.bucket;
  if (keys.length !== 1 || !PING_BUCKETS.includes(bucket as (typeof PING_BUCKETS)[number])) {
    return c.json({ error: "Invalid daily count" }, 400);
  }
  if (!c.env.COUNTS) return c.json({ error: "Daily count unavailable" }, 503);
  const day = new Date().toISOString().slice(0, 10);
  await c.env.COUNTS.prepare(
    "INSERT INTO daily_counts (day, bucket, count) VALUES (?1, ?2, 1) ON CONFLICT(day, bucket) DO UPDATE SET count = count + 1",
  )
    .bind(day, bucket)
    .run();
  return c.body(null, 204, { "Cache-Control": "no-store" });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// ---- Share-preview images, rendered once and kept in R2. ----
app.get("/og/:file", async (c) => {
  const match = /^(\d{1,3})-(\d{1,3})\.png$/.exec(c.req.param("file"));
  const lookup = await countsLookup(c.env, c.req.url);
  const count = match ? lookup(Number(match[1])) : undefined;
  if (!match || !count || Number(match[2]) < 1 || Number(match[2]) > count) return c.json({ error: "Not Found" }, 404);
  const key = `og/v1/${match[1]}-${match[2]}.png`;
  const headers = { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" };

  const cached = await c.env.OG_CACHE?.get(key);
  if (cached) return new Response(cached.body, { headers });

  const feed = await surah(c.env, c.req.url, Number(match[1]));
  const verse = feed.verses[Number(match[2]) - 1];
  const png = await renderOgPng({
    arabic: verse.arabic,
    translation: verse.translation,
    chapterName: feed.chapter.nameSimple,
    verseKey: verse.verseKey,
  });
  if (c.env.OG_CACHE) c.executionCtx.waitUntil(c.env.OG_CACHE.put(key, png, { httpMetadata: { contentType: "image/png" } }));
  return new Response(png, { headers });
});

// ---- Sitemap and robots. ----
app.get("/sitemap.xml", async (c) => {
  const origin = originOf(c.env, c.req.url);
  const urls = [`${origin}/`];
  for (const chapter of await chapters(c.env, c.req.url)) {
    urls.push(`${origin}/${chapter.id}`);
    for (let a = 1; a <= chapter.versesCount; a += 1) urls.push(`${origin}/${chapter.id}/${a}`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=86400" });
});

app.get("/robots.txt", (c) =>
  c.text(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${originOf(c.env, c.req.url)}/sitemap.xml\n`, 200, {
    "Cache-Control": "public, max-age=86400",
  }),
);

// ---- App pages: index.html with runtime config and, for shared links, preview tags. ----
async function page(env: Env, url: string, pathname: string): Promise<Response> {
  const html = await (await asset(env, url, "/index.html")).text();
  const target = parsePreviewPath(pathname, await countsLookup(env, url));
  let preview = null;
  if (target) {
    const feed = await surah(env, url, target.surah);
    preview = buildPreview({
      origin: originOf(env, url),
      surah: target.surah,
      ayah: target.ayah,
      chapterName: feed.chapter.nameSimple,
      translatedName: feed.chapter.translatedName,
      versesCount: feed.chapter.versesCount,
      translation: target.ayah ? feed.verses[target.ayah - 1]?.translation : undefined,
    });
  }
  return new Response(injectHead(html, { supportUrl: env.SUPPORT_URL ?? "", preview }), {
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-cache" },
  });
}

const PAGE = /^\/(?:|index\.html|privacy|feel|\d{1,3}(?:\/\d{1,3})?)\/?$/;

app.get("*", async (c) => {
  const pathname = new URL(c.req.url).pathname;
  if (PAGE.test(pathname)) return page(c.env, c.req.url, pathname);
  const fromAssets = await c.env.ASSETS.fetch(c.req.raw);
  if (fromAssets.status !== 404) return fromAssets;
  const accept = c.req.header("accept") ?? "";
  return accept.includes("text/html") ? page(c.env, c.req.url, pathname) : c.json({ error: "Not Found" }, 404);
});

app.onError((error, c) => {
  console.error("request failed", c.req.path, error instanceof Error ? error.message : String(error));
  return c.json({ error: "Internal Server Error" }, 500);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return withSecurityHeaders(await app.fetch(request, env, ctx));
  },
};
