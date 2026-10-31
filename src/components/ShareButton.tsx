import { useEffect, useRef, useState } from "react";
import { Copy, Image as ImageIcon, Layers, Link2, LoaderCircle, Share2, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { shareData } from "@/lib/share";
import { setShareData } from "@/lib/ayahSet";
import { IS_PREVIEW } from "@/lib/preview";

type Props = {
  verseKey: string;
  chapterName: string;
  translation: string;
  /** When reading a set (a feeling, or a set someone sent), offer to pass the whole set on. */
  setKeys?: string[];
};

type Status = "idle" | "copied";

function imagePath(verseKey: string) {
  const [surah, ayah] = verseKey.split(":");
  return `/og/${Number(surah)}-${Number(ayah)}.png`;
}

function fileName(verseKey: string) {
  return `scroll-the-quran-${verseKey.replace(":", "-")}.png`;
}

/**
 * Share sheet: the ayah as an image card (the same artwork WhatsApp shows for the link), the link
 * itself, or the whole set. The image is fetched only once the sheet is open, from our own origin.
 */
export function ShareButton({ verseKey, chapterName, translation, setKeys }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [image, setImage] = useState<File | null>(null);
  const [imageState, setImageState] = useState<"loading" | "ready" | "unavailable">("loading");
  const hasShareSheet = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const isSet = Boolean(setKeys && setKeys.length > 1);

  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 2200);
    return () => clearTimeout(timer);
  }, [status]);

  const request = useRef(0);

  function openSheet() {
    setOpen(true);
    const id = ++request.current;
    setImage(null);
    if (IS_PREVIEW) {
      setImageState("unavailable");
      return;
    }
    setImageState("loading");
    fetch(imagePath(verseKey), { credentials: "omit", referrerPolicy: "no-referrer" })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (id !== request.current) return;
        setImage(new File([blob], fileName(verseKey), { type: "image/png" }));
        setImageState("ready");
      })
      .catch(() => {
        if (id === request.current) setImageState("unavailable");
      });
  }

  function changeOpen(next: boolean) {
    if (!next) request.current += 1;
    setOpen(next);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      window.prompt("Copy this link", url);
    }
    changeOpen(false);
  }

  async function send(data: ShareData & { url: string }) {
    if (hasShareSheet) {
      try {
        await navigator.share(data);
        changeOpen(false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy(data.url);
  }

  async function sendImage() {
    if (!image) return;
    const data = shareData(window.location.origin, verseKey, chapterName, translation);
    const withFile = { files: [image], text: `${data.text}\n${data.url}` };
    if (hasShareSheet && navigator.canShare?.(withFile)) {
      try {
        await navigator.share(withFile);
        changeOpen(false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    // No file sharing here (most desktops): save the card instead.
    const href = URL.createObjectURL(image);
    const link = document.createElement("a");
    link.href = href;
    link.download = image.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    changeOpen(false);
  }

  const single = () => shareData(window.location.origin, verseKey, chapterName, translation);
  const whole = () => setShareData(window.location.origin, setKeys ?? [verseKey], translation);
  const canShareFiles = hasShareSheet && typeof navigator.canShare === "function";
  const row =
    "flex min-h-14 w-full cursor-pointer items-center gap-4 rounded-2xl px-4 text-left text-base text-[var(--cream)] outline-none transition-colors duration-150 hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] disabled:cursor-default disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="share-button icon-button pointer-events-auto"
        aria-label={`Share ${chapterName} ${verseKey}`}
      >
        <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-[max(12px,env(safe-area-inset-bottom))] max-w-md gap-0 rounded-3xl border-[var(--line)] bg-[var(--panel)] p-3 text-[var(--cream)] shadow-2xl [translate:-50%_0]"
        >
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-2">
            <div>
              <DialogTitle className="text-base font-medium">Share {chapterName} {verseKey}</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[var(--muted)]">
                Links carry only the ayah. Nothing about you goes with them.
              </DialogDescription>
            </div>
            <DialogClose className="icon-button -mr-1 -mt-1" aria-label="Close share options">
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogClose>
          </div>

          {imageState !== "unavailable" && (
            <button type="button" className={row} onClick={sendImage} disabled={imageState !== "ready"}>
              {imageState === "loading" ? (
                <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-[var(--gold)]" aria-hidden="true" />
              ) : (
                <ImageIcon className="h-5 w-5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
              )}
              <span>
                {canShareFiles ? "Send as image" : "Save as image"}
                <span className="block text-xs text-[var(--muted)]">Arabic and translation on one card</span>
              </span>
            </button>
          )}
          {isSet && (
            <button type="button" className={row} onClick={() => send(whole())}>
              <Layers className="h-5 w-5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
              <span>
                {hasShareSheet ? `Send all ${setKeys!.length} ayahs` : `Copy link to all ${setKeys!.length} ayahs`}
                <span className="block text-xs text-[var(--muted)]">They open one at a time, like here</span>
              </span>
            </button>
          )}
          {hasShareSheet && (
            <button type="button" className={row} onClick={() => send(single())}>
              <Link2 className="h-5 w-5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
              <span>Send link</span>
            </button>
          )}
          <button type="button" className={row} onClick={() => copy(single().url)}>
            <Copy className="h-5 w-5 shrink-0 text-[var(--gold)]" aria-hidden="true" />
            <span>Copy link</span>
          </button>
        </DialogContent>
      </Dialog>
      {status === "copied" && (
        <p role="status" className="fixed inset-x-0 top-[max(72px,calc(env(safe-area-inset-top)+56px))] z-50 mx-auto w-fit rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--cream)] shadow-xl">
          Link copied
        </p>
      )}
    </>
  );
}
