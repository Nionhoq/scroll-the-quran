import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Pause, Play, RefreshCw } from "lucide-react";
import type { Ayah, Chapter, TafsirExcerpt } from "@contracts/quran";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  ayah: Ayah | null;
  chapter: Chapter;
  onOpenChange: (open: boolean) => void;
  isPlaying: boolean;
  onPlay: () => void;
};

export function UnderstandDrawer({ ayah, chapter, onOpenChange, isPlaying, onPlay }: Props) {
  const [tab, setTab] = useState<"tafsir" | "words">("tafsir");
  const verseKey = ayah?.verseKey ?? "1:1";
  const tafsir = useQuery({
    queryKey: ["tafsir", verseKey],
    queryFn: async (): Promise<TafsirExcerpt> => {
      const response = await fetch(`/api/tafsir/${verseKey}`, {
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) throw new Error("Tafsir unavailable");
      return response.json() as Promise<TafsirExcerpt>;
    },
    enabled: Boolean(ayah),
    retry: 1,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <Drawer open={Boolean(ayah)} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[88dvh] max-w-2xl rounded-t-3xl border-[var(--line)] bg-[var(--panel)] text-[var(--cream)] outline-none">
        <div className="min-h-0 overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))] sm:px-8">
          <DrawerHeader className="px-0 pb-4 pt-3 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DrawerTitle className="text-xl font-medium tracking-tight">
                  {chapter.nameSimple} · {ayah?.verseNumber}
                </DrawerTitle>
                <DrawerDescription className="mt-2 text-sm text-[var(--muted)]">
                  Translation and established commentary
                </DrawerDescription>
              </div>
              <button type="button" onClick={onPlay} className="icon-button shrink-0" aria-label={isPlaying ? "Pause this ayah" : "Play this ayah"}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
          </DrawerHeader>

          {ayah && (
            <>
              <section aria-labelledby="translation-heading" className="border-b border-[var(--line)] pb-6">
                <h3 id="translation-heading" className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--gold)]">
                  Sahih International
                </h3>
                <p className="mt-3 text-base leading-7 text-[var(--cream-soft)]">{ayah.translation}</p>
              </section>

              <div className="mt-6 flex gap-6 border-b border-[var(--line)]" role="tablist" aria-label="Understanding options">
                {(["tafsir", "words"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={tab === item}
                    onClick={() => setTab(item)}
                    className={`relative min-h-11 cursor-pointer px-0 text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                      tab === item ? "text-[var(--cream)]" : "text-[var(--muted)] hover:text-[var(--cream)]"
                    }`}
                  >
                    {item === "tafsir" ? "Tafsir excerpt" : "Word by word"}
                    {tab === item && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--gold)]" />}
                  </button>
                ))}
              </div>

              {tab === "tafsir" ? (
                <section className="py-6" role="tabpanel" aria-label="Tafsir excerpt">
                  {tafsir.isPending ? (
                    <div className="flex min-h-36 items-center justify-center gap-3 text-sm text-[var(--muted)]">
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Loading Ibn Kathir…
                    </div>
                  ) : tafsir.isError ? (
                    <div className="flex min-h-36 flex-col items-center justify-center text-center">
                      <p className="text-sm text-[var(--cream-soft)]">The tafsir could not be loaded.</p>
                      <button type="button" onClick={() => tafsir.refetch()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[var(--gold)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
                        <RefreshCw className="h-4 w-4" /> Try again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-medium text-[var(--cream)]">{tafsir.data.title}</h3>
                        <span className="text-[11px] text-[var(--muted)]">Short excerpt · unedited source text</span>
                      </div>
                      <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-[var(--cream-soft)]">
                        {tafsir.data.excerpt}
                      </p>
                      <a
                        href={tafsir.data.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--gold)] underline decoration-[var(--line)] underline-offset-4 outline-none transition-colors hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
                      >
                        Read the full tafsir on Quran.com
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </>
                  )}
                </section>
              ) : (
                <section className="py-6" role="tabpanel" aria-label="Word by word meanings">
                  <div className="divide-y divide-[var(--line)]">
                    {ayah.words.map((word) => (
                      <div key={word.position} className="flex items-center gap-5 py-4">
                        <span lang="ar" dir="rtl" className="font-arabic-ui w-28 shrink-0 text-right text-2xl leading-9 text-[var(--cream)]">
                          {word.text}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm leading-6 text-[var(--cream-soft)]">{word.translation}</span>
                          {word.transliteration && <span className="mt-1 block text-xs text-[var(--muted)]">{word.transliteration}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs leading-5 text-[var(--muted)]">Verified word meanings and transliteration, provided with the ayah data.</p>
                </section>
              )}
            </>
          )}
        </div>
        <DrawerClose className="sr-only">Close tafsir</DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}
