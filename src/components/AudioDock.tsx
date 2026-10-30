import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { Ayah } from "@contracts/quran";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

type Props = {
  ayah: Ayah;
  reciterName: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioError: boolean;
  canGoBack: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function AudioDock({
  ayah,
  reciterName,
  isPlaying,
  currentTime,
  duration,
  audioError,
  canGoBack,
  onToggle,
  onPrevious,
  onNext,
}: Props) {
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(52px,calc(env(safe-area-inset-bottom)+36px))] sm:px-8">
      <div className="audio-dock pointer-events-auto mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--dock)] shadow-2xl backdrop-blur-xl">
        <div className="h-0.5 w-full bg-[var(--line)]" aria-hidden="true">
          <div
            className="h-full bg-[var(--gold)] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex min-h-[72px] items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canGoBack}
            className="icon-button"
            aria-label="Previous ayah"
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={!ayah.audioUrl}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--gold)] text-[var(--canvas)] outline-none transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--cream)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isPlaying ? "Pause recitation" : "Play recitation"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="icon-button"
            aria-label="Next ayah"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="ml-2 min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--cream)]">
              {audioError ? "Audio unavailable · tap to retry" : reciterName}
            </p>
            <p className="mt-1 text-[11px] tabular-nums text-[var(--muted)]">
              {ayah.verseKey} · {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
