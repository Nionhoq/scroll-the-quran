import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Chapter } from "@contracts/quran";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapters: Chapter[];
  currentChapterId: number;
  onSelect: (chapterId: number) => void;
};

export function SurahDialog({
  open,
  onOpenChange,
  chapters,
  currentChapterId,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return chapters;
    return chapters.filter((chapter) =>
      `${chapter.id} ${chapter.nameSimple} ${chapter.translatedName} ${chapter.nameArabic}`
        .toLowerCase()
        .includes(term),
    );
  }, [chapters, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[86dvh] max-w-xl grid-rows-none flex-col gap-0 overflow-hidden rounded-3xl border-[var(--line)] bg-[var(--panel)] p-0 text-[var(--cream)] shadow-2xl"
      >
        <DialogHeader className="border-b border-[var(--line)] px-5 py-5 text-left sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-medium tracking-tight">Choose a surah</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-[var(--muted)]">
                Continue reading anywhere in the Quran.
              </DialogDescription>
            </div>
            <DialogClose className="icon-button -mr-2 -mt-2" aria-label="Close surah navigator">
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogClose>
          </div>
          <label className="mt-5 flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-4 focus-within:ring-2 focus-within:ring-[var(--gold)]">
            <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
            <span className="sr-only">Search surahs</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or number"
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-[var(--cream)] outline-none placeholder:text-[var(--muted)]"
            />
          </label>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5" role="list">
          {filtered.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => onSelect(chapter.id)}
              className={`flex min-h-[68px] w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-3 text-left outline-none transition-colors duration-150 hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                chapter.id === currentChapterId ? "bg-[var(--hover)]" : ""
              }`}
              role="listitem"
            >
              <span className="w-7 text-center text-xs tabular-nums text-[var(--muted)]">
                {chapter.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--cream)]">
                  {chapter.nameSimple}
                  {chapter.id === currentChapterId && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-[var(--gold)]">Current</span>
                  )}
                </span>
                <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                  {chapter.translatedName} · {chapter.versesCount} ayahs
                </span>
              </span>
              <span lang="ar" dir="rtl" className="font-arabic-ui text-xl text-[var(--cream-soft)]">
                {chapter.nameArabic}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center px-8 text-center">
              <p className="text-base text-[var(--cream)]">No surah found</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Try a different name or a number from 1 to 114.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
