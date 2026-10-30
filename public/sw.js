const VERSION = "scroll-quran-v4";
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const AUDIO_CACHE = `${VERSION}-audio`;
const CACHE_NAMES = [SHELL_CACHE, DATA_CACHE, AUDIO_CACHE];
const SHELL = [
  "/",
  "/index.html",
  "/data/chapters.json",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fonts/UthmanicHafs1Ver18.woff2",
  "/fonts/HankenGrotesk-Variable.woff2",
  "/fonts/Tajawal-Regular.ttf",
  "/fonts/Tajawal-Medium.ttf",
];
const pendingAudio = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL);
    const index = await cache.match("/index.html");
    if (index) {
      const html = await index.text();
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
      if (assets.length) await cache.addAll([...new Set(assets)]);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("scroll-quran-") && !CACHE_NAMES.includes(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") await cache.put(request, response.clone());
  return response;
}

function fetchAndCacheAudio(url, cache) {
  if (!pendingAudio.has(url)) {
    const pending = fetch(url)
      .then(async (response) => {
        if (response.ok && response.status === 200) await cache.put(url, response.clone());
      })
      .finally(() => pendingAudio.delete(url));
    pendingAudio.set(url, pending);
  }
  return pendingAudio.get(url);
}

async function rangedResponse(request, cached) {
  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return cached;
  const buffer = await cached.clone().arrayBuffer();
  const size = buffer.byteLength;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (!Number.isFinite(start) || start >= size || end < start) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const headers = new Headers(cached.headers);
  headers.set("Content-Type", headers.get("Content-Type") || "audio/mpeg");
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Accept-Ranges", "bytes");
  return new Response(buffer.slice(start, end + 1), { status: 206, headers });
}

async function handleAudio(event) {
  const request = event.request;
  const url = new URL(request.url);
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(url.href);
  const hasRange = request.headers.has("range");
  if (cached) return hasRange ? rangedResponse(request, cached) : cached;

  if (hasRange) {
    const response = await fetch(request);
    event.waitUntil(fetchAndCacheAudio(url.href, cache).catch(() => {}));
    return response;
  }

  const response = await fetch(request);
  if (response.ok && response.status === 200) await cache.put(url.href, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/audio/")) {
    event.respondWith(handleAudio(event));
    return;
  }
  if (url.pathname.startsWith("/data/surah/")) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(SHELL_CACHE);
      return (await cache.match("/index.html")) || Response.error();
    }));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/") || SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});
