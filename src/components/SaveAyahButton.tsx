import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { SAVED_MAX, toggleSaved, useSavedAyahs, type ToggleResult } from "@/lib/savedAyahs";

const NOTICES: Record<ToggleResult, string> = {
  saved: "Saved · find it in the surah list",
  removed: "Removed from saved",
  full: `Your saved list is full (${SAVED_MAX}). Remove one in the surah list to add another.`,
  invalid: "This ayah can’t be saved",
};

/** Save / un-save the ayah on screen. Saved ayahs appear at the top of the surah list. */
export function SaveAyahButton({ verseKey, chapterName }: { verseKey: string; chapterName: string }) {
  const saved = useSavedAyahs().includes(verseKey);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <>
      <button
        type="button"
        onClick={() => setNotice(NOTICES[toggleSaved(verseKey)])}
        className="icon-button shrink-0"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${chapterName} ${verseKey} from saved` : `Save ${chapterName} ${verseKey}`}
        title={saved ? "Saved" : "Save this ayah"}
        data-testid="save-ayah"
      >
        <Bookmark
          className={`h-[18px] w-[18px] transition-colors ${saved ? "fill-[var(--gold)] text-[var(--gold)]" : ""}`}
          aria-hidden="true"
        />
      </button>
      {notice && (
        <p
          role="status"
          className="pointer-events-none fixed inset-x-4 top-[max(72px,calc(env(safe-area-inset-top)+56px))] z-50 mx-auto w-fit max-w-sm rounded-2xl border text-center border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--cream)] shadow-xl"
        >
          {notice}
        </p>
      )}
    </>
  );
}
