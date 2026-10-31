import { useMemo, useState } from "react";
import { CornerDownRight, Search, X } from "lucide-react";
import type { Chapter } from "@contracts/quran";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseAyahQuery, searchChapters, type AyahTarget } from "@/lib/surahSearch";
import { resumeAyah, type Positions } from "@/hooks/useReadingProgress";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapters: Chapter[];
  currentChapterId: number;
  positions: Positions;
  /** Without an ayah, the surah reopens where it was left. */
  onSelect: (chapterId: number, ayah?: number) => void;
};

export function SurahDialog({
  open,
  onOpenChange,
  chapters,
  currentChapterId,
  positions,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => searchChapters(chapters, query), [chapters, query]);
  const jumps = useMemo(() => {
    const out: Array<AyahTarget & { label: string }> = [];
    const target = parseAyahQuery(chapters, query);
    if (target) out.push({ ...target, label: `Go to ${target.chapter.nameSimple} ${target.chapter.id}:${target.ayah}` });
    const current = chapters.find((chapter) => chapter.id === currentChapterId);
    const n = /^\d{1,3}$/.test(query.trim()) ? Number(query.trim()) : 0;
    if (current && n >= 1 && n <= current.versesCount) {
      out.push({ chapter: current, ayah: n, label: `Ayah ${n} of ${current.nameSimple}` });
    }
    return out;
  }, [chapters, currentChapterId, query]);

  const submit = () => {
    if (jumps[0]) onSelect(jumps[0].chapter.id, jumps[0].ayah);
    else if (filtered[0]) onSelect(filtered[0].id);
  };

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
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Name, number, or 2:255"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-[var(--cream)] outline-none placeholder:text-[var(--muted)]"
            />
          </label>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5" role="list">
          {jumps.map((jump) => (
            <button
              key={`${jump.chapter.id}:${jump.ayah}`}
              type="button"
              onClick={() => onSelect(jump.chapter.id, jump.ayah)}
              className="flex min-h-[60px] w-full cursor-pointer items-center gap-4 rounded-xl border border-[var(--line)] px-3 py-3 text-left outline-none transition-colors duration-150 hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] [&+&]:mt-2 [&:last-of-type]:mb-3"
              role="listitem"
              data-testid="jump-to-ayah"
            >
              <CornerDownRight className="h-4 w-7 shrink-0 text-[var(--gold)]" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--cream)]">{jump.label}</span>
            </button>
          ))}
          {filtered.map((chapter) => {
            const resume = resumeAyah(positions, chapter.id, chapter.versesCount);
            return (
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
                  {resume > 1 && <span className="text-[var(--gold)]"> · Resume at {resume}</span>}
                </span>
              </span>
              <span lang="ar" dir="rtl" className="font-arabic-ui text-xl text-[var(--cream-soft)]">
                {chapter.nameArabic}
              </span>
            </button>
            );
          })}
          {filtered.length === 0 && jumps.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center px-8 text-center">
              <p className="text-base text-[var(--cream)]">No surah found</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Try another spelling, a number from 1 to 114, or an ayah like 2:255.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
