export const PING_BUCKETS = ["new", "1", "2-7", "8-30", "31+"] as const;

export type PingBucket = (typeof PING_BUCKETS)[number];

export function getPingBucket(streak: number): PingBucket {
  if (!Number.isFinite(streak) || streak <= 0) return "new";
  if (streak === 1) return "1";
  if (streak <= 7) return "2-7";
  if (streak <= 30) return "8-30";
  return "31+";
}
