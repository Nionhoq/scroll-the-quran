import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, HeartHandshake, LoaderCircle, RefreshCw, Settings2 } from "lucide-react";
import { Link } from "react-router";
import { ShareButton } from "@/components/ShareButton";
import type { Ayah } from "@contracts/quran";
import { getStaticChapter, getStaticChapters } from "@/lib/staticQuran";
import { AyahView } from "@/components/AyahView";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AudioDock } from "@/components/AudioDock";
import { InstallCard } from "@/components/InstallCard";
import { DoneCard } from "@/components/DoneCard";
import { anchorLabel, gentleStreakLabel } from "@/lib/dailyAyah";
import { useDailyAyah } from "@/hooks/useDailyAyah";
import type { FontScale } from "@/components/ReaderSettings";

const UnderstandDrawer = lazy(() => import("@/components/UnderstandDrawer").then((module) => ({ default: module.UnderstandDrawer })));
const SurahDialog = lazy(() => import("@/components/SurahDialog").then((module) => ({ default: module.SurahDialog })));
const ReaderSettings = lazy(() => import("@/components/ReaderSettings").then((module) => ({ default: module.ReaderSettings })));
import { useReadingProgress } from "@/hooks/useReadingProgress";

export default function Home() {
  const { lastRead, recordRead } = useReadingProgress();
  const params = useParams<{ surah?: string; ayah?: string }>();
  const isDeepLink = params.surah !== undefined;
  const routeChapter = params.surah && /^\d{1,3}$/.test(params.surah) ? Number(params.surah) : NaN;
  const routeAyah = params.ayah && /^\d{1,3}$/.test(params.ayah) ? Number(params.ayah) : NaN;
  const validRoute =
    !isDeepLink ||
    (Number.isInteger(routeChapter) &&
      routeChapter >= 1 &&
      routeChapter <= 114 &&
      (params.ayah === undefined || (Number.isInteger(routeAyah) && routeAyah >= 1)));
  const initialChapter = isDeepLink && validRoute ? routeChapter : (lastRead?.chapterId ?? 1);
  const initialIndex = isDeepLink && validRoute && params.ayah ? routeAyah - 1 : 0;
  const [chapterId, setChapterId] = useState(initialChapter);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const [surahOpen, setSurahOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(
    () => localStorage.getItem("scroll-quran:transliteration") === "true",
  );
  const [fontScale, setFontScale] = useState<FontScale>(() => {
    const saved = Number(localStorage.getItem("scroll-quran:font-scale"));
    return saved === 0.9 || saved === 1.12 ? saved : 1;
  });

  const chaptersQuery = useQuery({
    queryKey: ["static-quran", "chapters"],
    queryFn: getStaticChapters,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
    enabled: surahOpen || currentIndex > 0,
  });
  const feedQuery = useQuery({
    queryKey: ["static-quran", "chapter", chapterId],
    queryFn: () => getStaticChapter(chapterId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
  const feed = feedQuery.data;
  const currentAyah = feed?.verses[currentIndex] ?? feed?.verses[0];
  const daily = useDailyAyah(currentAyah);
  const { markDrawerOpened } = daily;

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const restoredChapter = useRef<number | null>(null);
  const advancing = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(currentIndex);
  // While a button/key-driven scroll is animating, intermediate scroll positions must not
  // overwrite the target index (rapid taps used to land on the wrong ayah).
  const scrollTarget = useRef<number | null>(null);
  const scrollTargetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeWord, setActiveWord] = useState(-1);
  const activeWordRef = useRef(-1);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    localStorage.setItem("scroll-quran:transliteration", String(showTransliteration));
  }, [showTransliteration]);

  useEffect(() => {
    localStorage.setItem("scroll-quran:font-scale", String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    if (!feed || restoredChapter.current === chapterId) return;
    const savedIndex =
      lastRead?.chapterId === chapterId
        ? feed.verses.findIndex((ayah) => ayah.verseKey === lastRead.verseKey)
        : -1;
    const deepLinkIndex = isDeepLink && validRoute && routeChapter === chapterId && params.ayah ? routeAyah - 1 : -1;
    if (deepLinkIndex >= feed.verses.length) return;
    const nextIndex = deepLinkIndex >= 0 ? deepLinkIndex : savedIndex >= 0 ? savedIndex : 0;
    restoredChapter.current = chapterId;
    advancing.current = false;
    requestAnimationFrame(() => {
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      const container = scrollRef.current;
      if (container) {
        container.scrollTo({ top: nextIndex * container.clientHeight, behavior: "auto" });
      }
    });
  }, [feed, chapterId, lastRead, isDeepLink, validRoute, routeChapter, routeAyah, params.ayah]);

  useEffect(() => {
    if (currentAyah) recordRead(chapterId, currentAyah.verseKey);
  }, [chapterId, currentAyah, recordRead]);

  useEffect(() => {
    if (selectedAyah) markDrawerOpened(selectedAyah.verseKey);
  }, [selectedAyah, markDrawerOpened]);

  useEffect(() => {
    if (!currentAyah) return;
    const frame = requestAnimationFrame(() => {
      setSelectedAyah((selected) => (selected ? currentAyah : null));
    });
    return () => cancelAnimationFrame(frame);
  }, [currentAyah]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentAyah) return;
    if (!currentAyah.audioUrl) {
      audio.pause();
      requestAnimationFrame(() => setIsPlaying(false));
      return;
    }
    if (audio.dataset.verseKey === currentAyah.verseKey) return;

    const shouldResume = isPlayingRef.current;
    audio.src = currentAyah.audioUrl;
    audio.dataset.verseKey = currentAyah.verseKey;
    requestAnimationFrame(() => {
      setCurrentTime(0);
      setDuration(0);
      setActiveWord(-1);
      activeWordRef.current = -1;
      setAudioError(false);
    });
    if (shouldResume) {
      audio.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setIsPlaying(false);
        setAudioError(true);
      });
    }
  }, [currentAyah]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      audioRef.current?.pause();
    },
    [],
  );

  const changeChapter = useCallback((nextChapter: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const sameChapter = nextChapter === chapterId;
    advancing.current = !sameChapter;
    restoredChapter.current = sameChapter ? chapterId : null;
    setSelectedAyah(null);
    setSurahOpen(false);
    setCurrentIndex(0);
    if (!sameChapter) setChapterId(nextChapter);
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [chapterId]);

  const goToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      if (!feed) return;
      const bounded = Math.max(0, Math.min(index, feed.verses.length));
      if (bounded < feed.verses.length) {
        currentIndexRef.current = bounded;
        setCurrentIndex(bounded);
      }
      scrollTarget.current = bounded;
      if (scrollTargetTimer.current) clearTimeout(scrollTargetTimer.current);
      // Release the lock even if the user interrupts the animation.
      scrollTargetTimer.current = setTimeout(() => {
        scrollTarget.current = null;
        // Re-sync in case the user swiped elsewhere while the lock was held.
        scrollRef.current?.dispatchEvent(new Event("scroll"));
      }, 1200);
      scrollRef.current?.scrollTo({
        top: bounded * scrollRef.current.clientHeight,
        behavior,
      });
    },
    [feed],
  );

  const goNext = useCallback(() => {
    if (!feed) return;
    if (chapterId === 114 && currentIndexRef.current >= feed.verses.length - 1) {
      setIsPlaying(false);
      return;
    }
    goToIndex(currentIndexRef.current + 1);
  }, [chapterId, feed, goToIndex]);

  const goPrevious = useCallback(() => {
    goToIndex(currentIndexRef.current - 1);
  }, [goToIndex]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !feed) return;
    if (scrollTarget.current !== null) {
      const arrived = Math.abs(container.scrollTop - scrollTarget.current * container.clientHeight) < 2;
      if (!arrived) return;
      scrollTarget.current = null;
    }
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index >= 0 && index < feed.verses.length && index !== currentIndexRef.current) {
      setCurrentIndex(index);
    }
    if (index >= feed.verses.length && chapterId < 114 && !advancing.current) {
      advancing.current = true;
      advanceTimer.current = setTimeout(() => changeChapter(chapterId + 1), 350);
    }
  }, [changeChapter, chapterId, feed]);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentAyah?.audioUrl) return;
    if (isPlayingRef.current) {
      audio.pause();
      return;
    }
    if (audioError) {
      audio.load();
      setAudioError(false);
    }
    audio.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setAudioError(true);
    });
  }, [audioError, currentAyah]);

  const playSelectedAyah = useCallback(() => {
    if (!feed || !selectedAyah) return;
    const index = feed.verses.findIndex((ayah) => ayah.verseKey === selectedAyah.verseKey);
    if (index >= 0 && index !== currentIndexRef.current) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      goToIndex(index);
    } else {
      toggleAudio();
    }
  }, [feed, goToIndex, selectedAyah, toggleAudio]);

  const handleAudioTime = () => {
    const audio = audioRef.current;
    if (!audio || !currentAyah) return;
    const milliseconds = audio.currentTime * 1000;
    setCurrentTime(audio.currentTime);
    const segment = currentAyah.segments.find(
      (item) => milliseconds >= item[2] && milliseconds < item[3],
    );
    const nextWord = segment?.[0] ?? -1;
    if (nextWord !== activeWordRef.current) {
      activeWordRef.current = nextWord;
      setActiveWord(nextWord);
    }
  };

  const outOfRangeAyah = Boolean(
    feed && isDeepLink && validRoute && params.ayah && routeAyah > feed.verses.length,
  );
  if (!validRoute || outOfRangeAyah) return <Navigate to="/" replace />;

  if (feedQuery.isPending) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--canvas)] px-8 text-center">
        <p className="brand-mark text-sm">SCROLL THE QURAN</p>
        <LoaderCircle className="mt-8 h-5 w-5 animate-spin text-[var(--gold)]" aria-hidden="true" />
        <p className="mt-4 text-sm text-[var(--muted)]">Preparing your reading space…</p>
      </main>
    );
  }

  if (feedQuery.isError || !feed || !currentAyah) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--canvas)] px-8 text-center">
        <AlertCircle className="h-6 w-6 text-[var(--gold)]" aria-hidden="true" />
        <h1 className="mt-6 text-xl font-medium">We couldn’t open this surah.</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">Check your connection and try again. Your last-read position is safe on this device.</p>
        <button type="button" onClick={() => feedQuery.refetch()} className="mt-7 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] px-6 text-sm text-[var(--cream)] outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </main>
    );
  }

  const nextChapter = chaptersQuery.data?.find((chapter) => chapter.id === chapterId + 1);

  return (
    <main className="relative isolate h-[100dvh] overflow-hidden bg-[var(--canvas)] text-[var(--cream)]">
      <AmbientBackground offset={currentIndex} />
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-2 sm:w-28">
            <Link to="/feel" className="icon-button" aria-label="How do you feel?" title="How do you feel?">
              <HeartHandshake className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setSurahOpen(true)}
            className="pointer-events-auto mx-auto flex min-h-11 max-w-[230px] cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-xs text-[var(--cream-soft)] outline-none transition-colors duration-150 hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] sm:px-4"
            aria-label="Choose another surah"
          >
            <span className="truncate">{feed.chapter.nameSimple}</span>
            <span className="shrink-0 tabular-nums text-[var(--muted)]">
              {currentAyah.verseNumber} / {feed.chapter.versesCount}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          </button>

          <div className="pointer-events-auto flex w-auto items-center justify-end gap-1 sm:w-28">
            <div
              className="mr-1 flex h-11 items-center gap-1.5 text-xs tabular-nums text-[var(--cream-soft)]"
              title="Days with a completed ayah this week. Missing a day never resets it."
              aria-label={`${gentleStreakLabel(daily.recentDays)}${daily.doneToday ? ", done for today" : ""}`}
              data-testid="gentle-streak"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${daily.doneToday ? "bg-[var(--gold)]" : "border border-[var(--gold)]"}`} />
              {daily.recentDays}/7
              <span className="hidden text-[var(--muted)] md:inline">days</span>
            </div>
            <ShareButton verseKey={currentAyah.verseKey} chapterName={feed.chapter.nameSimple} translation={currentAyah.translation} />
            <button type="button" onClick={() => setSettingsOpen(true)} className="icon-button" aria-label="Reading settings">
              <Settings2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>
        {!daily.doneToday && daily.anchor && (
          <p className="mt-1 text-center text-[11px] tracking-wide text-[var(--muted)]" data-testid="anchor-reminder">
            Today’s ayah · {anchorLabel(daily.anchor)}
          </p>
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "j") {
            event.preventDefault();
            goNext();
          } else if (event.key === "ArrowUp" || event.key === "k") {
            event.preventDefault();
            goPrevious();
          }
        }}
        tabIndex={0}
        className="quran-feed relative z-10 h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-none outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--line)]"
        aria-label="Quran reader. Swipe or use up and down arrow keys to move between ayahs."
      >
        {feed.verses.map((ayah, index) => (
          Math.abs(index - currentIndex) <= 1 ? (
            <AyahView
              key={ayah.verseKey}
              ayah={ayah}
              chapter={feed.chapter}
              isActive={index === currentIndex}
              activeWord={index === currentIndex ? activeWord : -1}
              fontScale={fontScale}
              showTransliteration={showTransliteration}
              onUnderstand={() => setSelectedAyah(ayah)}
            />
          ) : (
            <article key={ayah.verseKey} className="h-[100dvh] snap-start snap-always" aria-hidden="true" />
          )
        ))}
        <section className="flex h-[100dvh] snap-start snap-always flex-col items-center justify-center px-8 pb-24 text-center" aria-label={chapterId < 114 ? "Continue to the next surah" : "End of the Quran"}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{chapterId < 114 ? "Next surah" : "Completion"}</p>
          {chapterId < 114 ? (
            <>
              {currentIndex >= feed.verses.length - 1 && (
                <p lang="ar" dir="rtl" className="font-arabic-ui mt-7 text-5xl text-[var(--cream)]">{nextChapter?.nameArabic ?? "السورة التالية"}</p>
              )}
              <p className="mt-4 text-lg text-[var(--cream-soft)]">{nextChapter?.nameSimple ?? "Continuing…"}</p>
              <button type="button" onClick={() => changeChapter(chapterId + 1)} className="mt-8 min-h-12 cursor-pointer rounded-full border border-[var(--line)] px-6 text-sm text-[var(--cream)] outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
                Continue reading
              </button>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-2xl font-medium">You’ve completed the Quran.</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">Return to any surah, or begin again at your own pace.</p>
              <button type="button" onClick={() => changeChapter(1)} className="mt-8 min-h-12 cursor-pointer rounded-full border border-[var(--line)] px-6 text-sm text-[var(--cream)] outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
                Return to Al-Fatihah
              </button>
            </>
          )}
        </section>
      </div>

      {daily.celebration ? (
        <DoneCard
          reference={`${feed.chapter.nameSimple} · ${daily.celebration}`}
          recentDays={daily.recentDays}
          anchor={daily.anchor}
          onClose={daily.dismissCelebration}
          onReadOneMore={() => {
            daily.dismissCelebration();
            goNext();
          }}
        />
      ) : (
        <InstallCard />
      )}
      <AudioDock
        ayah={currentAyah}
        reciterName={feed.reciterName}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        audioError={audioError}
        canGoBack={currentIndex > 0}
        onToggle={toggleAudio}
        onPrevious={goPrevious}
        onNext={goNext}
      />

      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => {
          setIsPlaying(true);
          setAudioError(false);
        }}
        onPause={(event) => {
          if (!event.currentTarget.ended) setIsPlaying(false);
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={handleAudioTime}
        onEnded={() => {
          daily.markAudioEnded(currentAyah.verseKey);
          if (chapterId === 114 && currentIndex >= feed.verses.length - 1) {
            setIsPlaying(false);
          } else {
            isPlayingRef.current = true;
            setIsPlaying(true);
            goNext();
          }
        }}
        onError={(event) => {
          if (event.currentTarget.error?.code === MediaError.MEDIA_ERR_ABORTED) return;
          if (currentAyah.audioUrl) {
            setAudioError(true);
            setIsPlaying(false);
          }
        }}
        aria-label={`Recitation of ${currentAyah.verseKey}`}
      />

      <Suspense fallback={null}>
        {selectedAyah && (
          <UnderstandDrawer
            key={selectedAyah.verseKey}
            ayah={selectedAyah}
            chapter={feed.chapter}
            onOpenChange={(open) => {
              if (!open) setSelectedAyah(null);
            }}
            isPlaying={isPlaying}
            onPlay={playSelectedAyah}
          />
        )}
        {surahOpen && (
          <SurahDialog
            open={surahOpen}
            onOpenChange={setSurahOpen}
            chapters={chaptersQuery.data ?? [feed.chapter]}
            currentChapterId={chapterId}
            onSelect={changeChapter}
          />
        )}
        {settingsOpen && (
          <ReaderSettings
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            showTransliteration={showTransliteration}
            onTransliterationChange={setShowTransliteration}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
            source={feed.source}
            anchor={daily.anchor}
            onAnchorChange={daily.setAnchor}
          />
        )}
      </Suspense>
    </main>
  );
}
