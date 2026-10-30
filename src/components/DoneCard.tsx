import { ArrowDown, X } from "lucide-react";
import { anchorLabel, gentleStreakLabel, type Anchor } from "@/lib/dailyAyah";
import { SupportLink } from "@/components/SupportLink";

type Props = {
  reference: string;
  recentDays: number;
  anchor: Anchor | null;
  onReadOneMore: () => void;
  onClose: () => void;
};

export function DoneCard({ reference, recentDays, anchor, onReadOneMore, onClose }: Props) {
  const anchorText = anchorLabel(anchor);
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Done for today"
      className="done-card fixed inset-x-4 bottom-[calc(max(16px,env(safe-area-inset-bottom))+104px)] z-40 mx-auto max-w-sm rounded-3xl border border-[var(--line)] bg-[var(--panel)]/95 px-6 pb-5 pt-6 text-center shadow-2xl backdrop-blur-md"
    >
      <button type="button" onClick={onClose} className="icon-button absolute right-2 top-2" aria-label="Close">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="brand-mark text-[10px] text-[var(--gold)]">DONE FOR TODAY</p>
      <p className="mt-3 text-lg font-medium text-[var(--cream)]">{reference}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {gentleStreakLabel(recentDays)}
        {anchorText ? ` · See you tomorrow, ${anchorText.toLowerCase()}.` : ""}
      </p>
      <button
        type="button"
        onClick={onReadOneMore}
        className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] px-5 text-sm text-[var(--cream-soft)] outline-none transition-colors hover:bg-[var(--hover)] hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
      >
        Read one more? <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <SupportLink className="mt-4 block text-xs" />
    </section>
  );
}
