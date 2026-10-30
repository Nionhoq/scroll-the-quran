import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { PING_BUCKETS } from "@contracts/ping";
import { log } from "../lib/logger";
import { incrementDailyCount } from "../queries/dailyCounts";

const pingSchema = z.object({ bucket: z.enum(PING_BUCKETS) }).strict();

export const pingRoutes = new Hono();

pingRoutes.post(
  "/",
  bodyLimit({ maxSize: 128, onError: (c) => c.body(null, 413) }),
  async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid daily count" }, 400);
    }

    const parsed = pingSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "Invalid daily count" }, 400);

    try {
      const day = new Date().toISOString().slice(0, 10);
      await incrementDailyCount(parsed.data.bucket, day);
      return c.body(null, 204, { "Cache-Control": "no-store" });
    } catch (error) {
      log.error("daily count failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ error: "Daily count unavailable" }, 503);
    }
  },
);
