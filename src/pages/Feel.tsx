import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, LoaderCircle, MessageCircle, Phone } from "lucide-react";
import type { Ayah, Chapter } from "@contracts/quran";
import type { Feeling, FeelingId, FeelingsFile } from "@contracts/feelings";
import feelingsData from "@/data/feelings.json";
import { getStaticChapter } from "@/lib/staticQuran";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AyahView } from "@/components/AyahView";
import { AudioDock } from "@/components/AudioDock";
import { ShareButton } from "@/components/ShareButton";

const UnderstandDrawer = lazy(() => import("@/components/UnderstandDrawer").then((m) => ({ default: m.UnderstandDrawer })));

const FEELINGS = (feelingsData as FeelingsFile).feelings;
const UNDER_REVIEW = (feelingsData as FeelingsFile).reviewStatus !== "approved";

type Entry = { ayah: Ayah; chapter: Chapter };

/**
 * "How do you feel?" — tap a feeling, read a few hand-picked ayahs.
 * The chosen feeling lives only in this component's memory: it is never stored,
 * never sent to the server, and never placed in a URL.
 */
export default function Feel() {
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [crisis, setCrisis] = useState(false);

  if (crisis) return <CrisisScreen onBack={() => setCrisis(false)} />;
  if (feeling) return <FeelingReader feeling={feeling} onBack={() => setFeeling(null)} />;

  return (
    <main className="relative isolate min-h-[100dvh] overflow-x-hidden bg-[var(--canvas)] text-[var(--cream)]">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <Link to="/" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full text-sm text-[var(--cream-soft)] outline-none hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to reading
        </Link>

        <div className="my-auto py-8">
          <p className="brand-mark text-[11px] text-[var(--gold)]">COMFORT AND CLARITY</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.03em]">How do you feel?</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Choose one. A few ayahs will follow, one at a time. Your choice stays on this screen only.</p>

          <div className="mt-8 grid grid-cols-2 gap-3" role="group" aria-label="Feelings">
            {FEELINGS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFeeling(item)}
                className="min-h-16 cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--panel)]/70 px-4 text-left text-base text-[var(--cream)] outline-none backdrop-blur-sm transition-colors duration-150 hover:border-[var(--gold)] hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCrisis(true)}
            className="mt-4 flex min-h-16 w-full cursor-pointer items-center justify-center rounded-2xl border border-[oklch(0.75_0.09_25/0.6)] bg-[oklch(0.3_0.05_25/0.35)] px-4 text-base font-medium text-[var(--cream)] outline-none transition-colors hover:bg-[oklch(0.35_0.06_25/0.45)] focus-visible:ring-2 focus-visible:ring-[var(--cream)]"
          >
            I’m not okay
          </button>

          {UNDER_REVIEW && (
            <p className="mt-6 text-center text-xs text-[var(--muted)]" data-testid="review-note">
              Selection under scholarly review.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function CrisisScreen({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    document.getElementById("crisis-heading")?.focus();
  }, []);
  const action =
    "flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 text-base text-[var(--cream)] outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]";
  return (
    <main className="relative isolate min-h-[100dvh] bg-[var(--canvas)] text-[var(--cream)]">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full text-sm text-[var(--cream-soft)] outline-none hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <section className="my-auto py-8" aria-labelledby="crisis-heading">
          <h1 id="crisis-heading" tabIndex={-1} className="text-3xl font-medium leading-tight tracking-[-0.02em] outline-none">
            You don’t have to carry this alone.
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--cream-soft)]">
            If you’re thinking about harming yourself or you’re in crisis, please reach out now.
          </p>
          <div className="mt-8 space-y-3">
            <a href="tel:988" className={action}>
              <Phone className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Call 9-8-8</span><span className="block text-xs text-[var(--muted)]">Suicide Crisis Helpline · Canada</span></span>
            </a>
            <a href="sms:988" className={action}>
              <MessageCircle className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Text 9-8-8</span><span className="block text-xs text-[var(--muted)]">Canada</span></span>
            </a>
            <a href="tel:911" className={action}>
              <Phone className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Emergency: 911</span><span className="block text-xs text-[var(--muted)]">If you or someone is in immediate danger</span></span>
            </a>
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={action}>
              <ExternalLink className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Outside Canada</span><span className="block text-xs text-[var(--muted)]">Find a helpline at findahelpline.com</span></span>
            </a>
          </div>
          <p className="mt-6 text-sm leading-6 text-[var(--muted)]">Talking to someone you trust—family, a friend, or your imam—can help too.</p>
        </section>
      </div>
    </main>
  );
}

function parseKey(key: string) {
  const [surah, ayah] = key.split(":").map(Number);
  return { surah, ayah };
}

function FeelingReader({ feeling, onBack }: { feeling: Feeling; onBack: () => void }) {
  const surahs = useMemo(() => [...new Set(feeling.verses.map((key) => parseKey(key).surah))], [feeling]);
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
    return feeling.verses.flatMap((key) => {
      const { surah, ayah } = parseKey(key);
      const feed = bySurah.get(surah);
      const verse = feed?.verses[ayah - 1];
      return feed && verse ? [{ ayah: verse, chapter: feed.chapter }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, feeling]);

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
        <button type="button" onClick={onBack} className="mt-6 min-h-11 rounded-full border border-[var(--line)] px-5 text-sm">Back to feelings</button>
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
      <AmbientBackground tint={feeling.id as FeelingId} progress={entries.length > 1 ? index / (entries.length - 1) : 1} />
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button type="button" onClick={onBack} className="pointer-events-auto inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-xs text-[var(--cream-soft)] outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]" aria-label="Back to feelings">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Feelings
          </button>
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="text-xs tabular-nums text-[var(--muted)]" data-testid="feeling-progress">{index + 1} / {entries.length}</span>
            <ShareButton verseKey={current.ayah.verseKey} chapterName={current.chapter.nameSimple} translation={current.ayah.translation} />
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
        aria-label="Ayahs for how you feel"
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
          <p className="text-lg text-[var(--cream-soft)]">Take a breath. You can return any time.</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/" className="min-h-12 rounded-full border border-[var(--line)] px-6 py-3 text-sm outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">Return to reading</Link>
            <button type="button" onClick={onBack} className="min-h-12 cursor-pointer rounded-full px-6 text-sm text-[var(--muted)] outline-none hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">Choose another feeling</button>
          </div>
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
