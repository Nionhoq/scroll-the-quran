import { ExternalLink, X } from "lucide-react";
import { Link } from "react-router";
import type { QuranSource } from "@contracts/quran";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type FontScale = 0.9 | 1 | 1.12;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showTransliteration: boolean;
  onTransliterationChange: (value: boolean) => void;
  fontScale: FontScale;
  onFontScaleChange: (value: FontScale) => void;
  source: QuranSource;
};

export function ReaderSettings({
  open,
  onOpenChange,
  showTransliteration,
  onTransliterationChange,
  fontScale,
  onFontScaleChange,
  source,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 rounded-3xl border-[var(--line)] bg-[var(--panel)] p-0 text-[var(--cream)]"
      >
        <DialogHeader className="border-b border-[var(--line)] px-6 py-5 text-left">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-medium">Reading settings</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-[var(--muted)]">Adjust the page to your rhythm.</DialogDescription>
            </div>
            <DialogClose className="icon-button -mr-2 -mt-2" aria-label="Close reading settings">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="px-6 py-2">
          <label className="flex min-h-[76px] cursor-pointer items-center justify-between gap-4 border-b border-[var(--line)] py-4">
            <span>
              <span className="block text-sm font-medium">Transliteration</span>
              <span className="mt-1 block text-xs text-[var(--muted)]">Show Latin pronunciation beneath the translation.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={showTransliteration}
              onChange={(event) => onTransliterationChange(event.target.checked)}
              className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold)]"
            />
          </label>

          <div className="border-b border-[var(--line)] py-5">
            <p className="text-sm font-medium">Text size</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Scales Arabic and translation together.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--canvas)] p-1" role="group" aria-label="Text size">
              {([
                [0.9, "Compact"],
                [1, "Default"],
                [1.12, "Large"],
              ] as Array<[FontScale, string]>).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={fontScale === value}
                  onClick={() => onFontScaleChange(value)}
                  className={`min-h-11 cursor-pointer rounded-lg text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                    fontScale === value
                      ? "bg-[var(--hover)] text-[var(--cream)]"
                      : "text-[var(--muted)] hover:text-[var(--cream)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-5 text-xs leading-5 text-[var(--muted)]">
            <p>Uthmani Arabic · Sahih International</p>
            <p className="mt-1">Recitation by Mishary Rashid Alafasy</p>
            <p className="mt-1">Content served via {source}.</p>
            <Link
              to="/privacy"
              onClick={() => onOpenChange(false)}
              className="mt-3 inline-flex min-h-11 items-center text-[var(--gold)] underline decoration-[var(--line)] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            >
              Privacy, in plain words
            </Link>
            <a
              href="https://quran.com/developers"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-[var(--gold)] underline decoration-[var(--line)] underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            >
              Data and attribution <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
