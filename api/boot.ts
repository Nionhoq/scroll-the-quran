import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { log } from "./lib/logger";
import { handleClientLog } from "./lib/clientlog";
import { REQUEST_ID_HEADER, runWithRequestId } from "./lib/requestcontext";
import { audioRoutes } from "./routes/audio";
import { pingRoutes } from "./routes/ping";
import { tafsirRoutes } from "./routes/tafsir";

const app = new Hono<{ Bindings: HttpBindings }>();

const securityHeaders: Record<string, string> = {
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

function applySecurityHeaders(headers: Headers) {
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
}

/**
 * Final safety net: every response leaving the server carries the privacy headers,
 * including the SPA fallback (shared links like /13/28), /privacy and 404s, which
 * Hono's notFound path does not run through middleware.
 */
export function withSecurityHeaders(response: Response): Response {
  try {
    applySecurityHeaders(response.headers);
    return response;
  } catch {
    // Immutable headers (e.g. a proxied upstream response): copy into a new Response.
    const headers = new Headers(response.headers);
    applySecurityHeaders(headers);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
}

app.use("*", compress());

// Apply privacy headers after routing so they also cover raw tRPC responses.
app.use("*", async (c, next) => {
  await next();
  applySecurityHeaders(c.res.headers);
  if (/^\/(?:data|assets|fonts|icons)\//.test(c.req.path)) {
    c.res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
});

// Request IDs support server error diagnosis without routine access logs.
app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  await runWithRequestId(requestId, async () => {
    await next();
    c.res.headers.set(REQUEST_ID_HEADER, requestId);
  });
});

app.route("/audio", audioRoutes);

// Scoped to the tRPC route, NOT global: on the dev server (@hono/vite-dev-server)
// a global bodyLimit breaks bodyless requests. Hono's bodyLimit reads any truthy
// request stream to the end and then rebuilds the Request with `new Request(raw,
// { body, duplex: "half" })`; the dev server's Response/Request class makes that
// rebuild throw `TypeError: Cannot read private member #state ...`, so every
// bodyless request (DELETE/PATCH on the app's own REST routes) 500s at dispatch.
// /api/log keeps its own 64KB caps in lib/clientlog.ts, so it needs no middleware.
app.use("/api/trpc/*", bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
// Browser-side log sink (see lib/clientlog.ts). Must be registered before the
// /api/* 404 catch-all below. bodyLimit guards it too: lib/clientlog.ts caps the
// body itself, but only AFTER Hono has read it into memory, and this route sits
// on the public preview URL — the cap has to bite before the read.
app.post(
  "/api/log",
  bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.body(null, 413) }),
  handleClientLog,
);
app.route("/api/ping", pingRoutes);
app.route("/api/tafsir", tafsirRoutes);
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Unhandled request errors must reach /tmp/kimi-logs/app.log, not just stdout:
// that file is what the building agent reads when a preview 500s, and without
// this the log looks clean while the request actually failed. Response stays a
// generic 500 (no stack leaked to the caller); the detail goes to the log only.
app.onError((err, c) => {
  log.error("unhandled request error", {
    method: c.req.method,
    path: c.req.path,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  const response = c.json({ error: "Internal Server Error" }, 500);
  applySecurityHeaders(response.headers);
  return response;
});

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: async (request, bindings) => withSecurityHeaders(await app.fetch(request, bindings)), port }, () => {
    log.info(`Server running on http://localhost:${port}/`);
  });
}
