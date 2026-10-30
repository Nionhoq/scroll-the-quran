import fs from "node:fs/promises";
import path from "node:path";
import type { PingBucket } from "@contracts/ping";
import { env } from "../lib/env";

/**
 * Storage for the anonymous daily count. Only (day, bucket) -> count is ever stored.
 * Swap the implementation per host: JSON file (default), MySQL (DATABASE_URL),
 * or a Cloudflare KV/D1 store later. Nothing here can identify a reader.
 */
export interface CountStore {
  increment(day: string, bucket: PingBucket): Promise<void>;
  read(day: string): Promise<Partial<Record<PingBucket, number>>>;
}

type CountFile = Record<string, Partial<Record<PingBucket, number>>>;

export function createFileStore(file: string): CountStore {
  const resolved = path.resolve(file);
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<CountFile> {
    try {
      return JSON.parse(await fs.readFile(resolved, "utf8")) as CountFile;
    } catch {
      return {};
    }
  }

  return {
    increment(day, bucket) {
      // Serialize writes so concurrent pings never lose an increment.
      const next = queue.then(async () => {
        const data = await load();
        const row = (data[day] ??= {});
        row[bucket] = (row[bucket] ?? 0) + 1;
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        const tmp = `${resolved}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(data));
        await fs.rename(tmp, resolved);
      });
      queue = next.catch(() => {});
      return next;
    },
    async read(day) {
      await queue;
      return (await load())[day] ?? {};
    },
  };
}

export function createMemoryStore(): CountStore {
  const data: CountFile = {};
  return {
    async increment(day, bucket) {
      const row = (data[day] ??= {});
      row[bucket] = (row[bucket] ?? 0) + 1;
    },
    async read(day) {
      return { ...(data[day] ?? {}) };
    },
  };
}

async function createMysqlStore(): Promise<CountStore> {
  const [{ sql, eq }, { dailyCounts }, { getDb }] = await Promise.all([
    import("drizzle-orm"),
    import("@db/schema"),
    import("./connection"),
  ]);
  return {
    async increment(day, bucket) {
      await getDb()
        .insert(dailyCounts)
        .values({ day, bucket, count: 1 })
        .onDuplicateKeyUpdate({ set: { count: sql`${dailyCounts.count} + 1` } });
    },
    async read(day) {
      const rows = await getDb().select().from(dailyCounts).where(eq(dailyCounts.day, day));
      return Object.fromEntries(rows.map((row) => [row.bucket, row.count]));
    },
  };
}

let store: Promise<CountStore> | null = null;

export function getCountStore(): Promise<CountStore> {
  store ??= env.databaseUrl ? createMysqlStore() : Promise.resolve(createFileStore(env.countsFile));
  return store;
}

export async function incrementDailyCount(bucket: PingBucket, day: string) {
  await (await getCountStore()).increment(day, bucket);
}
