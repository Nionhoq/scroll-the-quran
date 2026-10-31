import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import type { Ayah, Chapter } from "@contracts/quran";
import type { FeelingId } from "@contracts/feelings";
import { getStaticChapter } from "@/lib/staticQuran";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AyahView } from "@/components/AyahView";
import { AudioDock } from "@/components/AudioDock";
import { ShareButton } from "@/components/ShareButton";

const UnderstandDrawer = lazy(() => import("@/components/UnderstandDrawer").then((m) => ({ default: m.UnderstandDrawer })));

type Entry = { ayah: Ayah; chapter: Chapter };

function parseKey(key: string) {
  const [surah, ayah] = key.split(":").map(Number);
  return { surah, ayah };
}

type Props = {
  verses: string[];
  /** Light tint for a feeling's set; none for a set someone sent (we don't know, and don't ask). */
  tint?: FeelingId;
  backLabel: string;
  backAria: string;
  onBack: () => void;
  ariaLabel: string;
  /** Last screen, after the final ayah. */
  ending: ReactNode;
};

/** Reads a short list of ayahs one at a time, with recitation, tafsir and sharing. */
export function AyahSetReader({ verses, tint, backLabel, backAria, onBack, ariaLabel, ending }: Props) {
  const surahs = useMemo(() => [...new Set(verses.map((key) => parseKey(key).surah))], [verses]);
  const queries = useQueries({
    queries: surahs.map((surah) => ({
      queryKey: ["static-quran", "chapter", surah],
      queryFn: () => getStaticChapter(surah),
      staleTime: Number.POSITIVE_INFINITY,
      retry: 1,
    })),
  });
  const ready = queries.every((query) => query.data);
  const failed = queries.some((query) => query.isError);

  const entries = useMemo<Entry[]>(() => {
    if (!ready) return [];
    const bySurah = new Map(queries.map((query) => [query.data!.chapter.id, query.data!]));
    return verses.flatMap((key) => {
      const { surah, ayah } = parseKey(key);
      const feed = bySurah.get(surah);
      const verse = feed?.verses[ayah - 1];
      return feed && verse ? [{ ayah: verse, chapter: feed.chapter }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, verses]);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeWord, setActiveWord] = useState(-1);
  const [audioError, setAudioError] = useState(false);
  const [drawerAyah, setDrawerAyah] = useState<Entry | null>(null);
  const current = entries[index];

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  const goTo = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(next, entries.length));
    if (bounded < entries.length) {
      indexRef.current = bounded;
      setIndex(bounded);
    }
    scrollRef.current?.scrollTo({ top: bounded * (scrollRef.current?.clientHeight ?? 0), behavior: "smooth" });
  }, [entries.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.ayah.audioUrl || audio.dataset.verseKey === current.ayah.verseKey) return;
    audio.src = current.ayah.audioUrl;
    audio.dataset.verseKey = current.ayah.verseKey;
    requestAnimationFrame(() => {
      setCurrentTime(0);
      setDuration(0);
      setActiveWord(-1);
      setAudioError(false);
    });
    if (playingRef.current) {
      audio.play().catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setAudioError(true);
      });
    }
  }, [current]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingRef.current) {
      audio.pause();
      return;
    }
    audio.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setAudioError(true);
    });
  }, []);

  if (failed) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--canvas)] px-8 text-center text-[var(--cream)]">
        <p>We couldn’t load these ayahs. Check your connection and try again.</p>
        <button type="button" onClick={onBack} className="mt-6 min-h-11 rounded-full border border-[var(--line)] px-5 text-sm">{backLabel}</button>
      </main>
    );
  }

  if (!ready || !current) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--gold)]" aria-label="Loading ayahs" />
      </main>
    );
  }

  return (
    <main className="relative isolate h-[100dvh] overflow-hidden bg-[var(--canvas)] text-[var(--cream)]">
      <AmbientBackground tint={tint} progress={entries.length > 1 ? index / (entries.length - 1) : 1} />
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button type="button" onClick={onBack} className="pointer-events-auto inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-xs text-[var(--cream-soft)] outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]" aria-label={backAria}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {backLabel}
          </button>
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="text-xs tabular-nums text-[var(--muted)]" data-testid="feeling-progress">{index + 1} / {entries.length}</span>
            <ShareButton verseKey={current.ayah.verseKey} chapterName={current.chapter.nameSimple} translation={current.ayah.translation} setKeys={verses} />
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          const next = Math.round(el.scrollTop / el.clientHeight);
          if (next < entries.length && next !== indexRef.current && Math.abs(el.scrollTop - next * el.clientHeight) < 2) {
            indexRef.current = next;
            setIndex(next);
          }
        }}
        className="quran-feed relative z-10 h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-none outline-none"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {entries.map((entry, i) => (
          <AyahView
            key={entry.ayah.verseKey}
            ayah={entry.ayah}
            chapter={entry.chapter}
            isActive={i === index}
            activeWord={i === index ? activeWord : -1}
            fontScale={1}
            showTransliteration={false}
            onUnderstand={() => setDrawerAyah(entry)}
          />
        ))}
        <section className="flex h-[100dvh] snap-start flex-col items-center justify-center px-8 pb-24 text-center">
          {ending}
        </section>
      </div>

      <AudioDock
        ayah={current.ayah}
        reciterName="Mishary Rashid Alafasy"
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        audioError={audioError}
        canGoBack={index > 0}
        onToggle={toggle}
        onPrevious={() => goTo(indexRef.current - 1)}
        onNext={() => goTo(indexRef.current + 1)}
      />
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={(event) => {
          if (!event.currentTarget.ended) setIsPlaying(false);
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => {
          const ms = event.currentTarget.currentTime * 1000;
          setCurrentTime(event.currentTarget.currentTime);
          setActiveWord(current.ayah.segments.find((s) => ms >= s[2] && ms < s[3])?.[0] ?? -1);
        }}
        onEnded={() => {
          if (indexRef.current >= entries.length - 1) setIsPlaying(false);
          else goTo(indexRef.current + 1);
        }}
        onError={(event) => {
          if (event.currentTarget.error?.code !== MediaError.MEDIA_ERR_ABORTED) {
            setAudioError(true);
            setIsPlaying(false);
          }
        }}
      />

      <Suspense fallback={null}>
        {drawerAyah && (
          <UnderstandDrawer
            key={drawerAyah.ayah.verseKey}
            ayah={drawerAyah.ayah}
            chapter={drawerAyah.chapter}
            onOpenChange={(open) => {
              if (!open) setDrawerAyah(null);
            }}
            isPlaying={isPlaying}
            onPlay={toggle}
          />
        )}
      </Suspense>
    </main>
  );
}
