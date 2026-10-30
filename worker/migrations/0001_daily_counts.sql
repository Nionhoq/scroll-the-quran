-- Anonymous daily count: only (day, bucket) -> total. No identifiers of any kind.
CREATE TABLE IF NOT EXISTS daily_counts (
  day TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('new', '1', '2-7', '8-30', '31+')),
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (day, bucket)
);
