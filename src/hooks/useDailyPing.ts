import { useEffect, useState } from "react";
import { getPingBucket } from "@contracts/ping";
import { calculateStreak, localDay, readingDays } from "./useReadingProgress";
import { IS_PREVIEW } from "@/lib/preview";

const LAST_PING_KEY = "scroll-quran:last-ping";

export function useDailyPing() {
  const [bucket] = useState(() => getPingBucket(calculateStreak(readingDays())));

  useEffect(() => {
    if (IS_PREVIEW) return; // no server behind a static preview
    const today = localDay();
    try {
      if (localStorage.getItem(LAST_PING_KEY) === today) return;
    } catch {
      return;
    }

    // Keep the optional count off the first-ayah critical path.
    const timer = setTimeout(() => {
      void fetch("/api/ping", {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket }),
      })
        .then((response) => {
          if (!response.ok) return;
          try {
            localStorage.setItem(LAST_PING_KEY, today);
          } catch {
            // Storage can be unavailable in private browsing; the count is optional.
          }
        })
        .catch(() => {
          // Reading never depends on the anonymous daily count.
        });
    }, 1500);

    return () => clearTimeout(timer);
  }, [bucket]);
}
