import {
  date,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { PING_BUCKETS } from "@contracts/ping";

export const dailyCounts = mysqlTable(
  "daily_counts",
  {
    day: date("day", { mode: "string" }).notNull(),
    bucket: mysqlEnum("bucket", PING_BUCKETS).notNull(),
    count: int("count", { unsigned: true }).notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.day, table.bucket] })],
);
