import "dotenv/config";

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  /** Optional. When set, daily counts are stored in MySQL; otherwise in a local JSON file. */
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** File used for daily counts when no database is configured. */
  countsFile: process.env.COUNTS_FILE ?? "data/daily-counts.json",
  /** External donation page. The app shows the support link only when this is set. */
  supportUrl: process.env.SUPPORT_URL ?? "",
  /** Public origin used in share links and preview tags, e.g. https://scrollquran.org */
  publicOrigin: (process.env.PUBLIC_ORIGIN ?? "").replace(/\/$/, ""),
};
