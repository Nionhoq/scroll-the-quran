import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { shareData } from "@/lib/share";

type Props = { verseKey: string; chapterName: string; translation: string };

export function ShareButton({ verseKey, chapterName, translation }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    const data = shareData(window.location.origin, verseKey, chapterName, translation);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Fall through to copying the link.
      }
    }
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", data.url);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        className="share-button icon-button pointer-events-auto"
        aria-label={`Share ${chapterName} ${verseKey}`}
      >
        <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
      {copied && (
        <p role="status" className="fixed inset-x-0 top-[max(72px,calc(env(safe-area-inset-top)+56px))] z-50 mx-auto w-fit rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--cream)] shadow-xl">
          Link copied
        </p>
      )}
    </>
  );
}
