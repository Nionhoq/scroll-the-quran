import { Hono } from "hono";
import { loadChapters } from "../lib/quranData";
import { env } from "../lib/env";

function originOf(url: string): string {
  return env.publicOrigin || new URL(url).origin;
}

export const seoRoutes = new Hono();

let sitemapCache: { origin: string; xml: string } | null = null;

seoRoutes.get("/sitemap.xml", async (c) => {
  const origin = originOf(c.req.url);
  if (sitemapCache?.origin !== origin) {
    const chapters = await loadChapters();
    const urls: string[] = [`${origin}/`];
    for (const chapter of chapters) {
      urls.push(`${origin}/${chapter.id}`);
      for (let ayah = 1; ayah <= chapter.versesCount; ayah += 1) urls.push(`${origin}/${chapter.id}/${ayah}`);
    }
    const body = urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n");
    sitemapCache = { origin, xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n` };
  }
  return c.body(sitemapCache.xml, 200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=86400" });
});

seoRoutes.get("/robots.txt", (c) =>
  c.text(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${originOf(c.req.url)}/sitemap.xml\n`, 200, { "Cache-Control": "public, max-age=86400" }),
);
