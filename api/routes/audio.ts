import { Hono } from "hono";

const reciters: Record<string, string> = {
  "7": "Alafasy/mp3",
};

export const audioRoutes = new Hono();

audioRoutes.get("/:reciter/:file", async (c) => {
  const reciter = reciters[c.req.param("reciter")];
  const file = c.req.param("file");
  if (!reciter || !/^\d{6}\.mp3$/.test(file)) {
    return c.json({ error: "Audio not found" }, 404);
  }

  const headers = new Headers({ Accept: "audio/mpeg" });
  const range = c.req.header("range");
  if (range) headers.set("Range", range);

  try {
    const upstream = await fetch(`https://verses.quran.foundation/${reciter}/${file}`, {
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return c.json({ error: "Audio unavailable" }, upstream.status === 404 ? 404 : 502);
    }

    const responseHeaders = new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "ETag", "Last-Modified"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    if (!responseHeaders.has("Content-Type")) responseHeaders.set("Content-Type", "audio/mpeg");
    if (!responseHeaders.has("Accept-Ranges")) responseHeaders.set("Accept-Ranges", "bytes");

    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch {
    return c.json({ error: "Audio unavailable" }, 502);
  }
});
