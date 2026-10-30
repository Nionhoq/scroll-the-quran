import { sql } from "drizzle-orm";
import { dailyCounts } from "@db/schema";
import type { PingBucket } from "@contracts/ping";
import { getDb } from "./connection";

export async function incrementDailyCount(bucket: PingBucket, day: string) {
  await getDb()
    .insert(dailyCounts)
    .values({ day, bucket, count: 1 })
    .onDuplicateKeyUpdate({
      set: { count: sql`${dailyCounts.count} + 1` },
    });
}
