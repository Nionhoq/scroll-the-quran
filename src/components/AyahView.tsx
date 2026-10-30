import { BookOpen } from "lucide-react";
import type { Ayah, Chapter } from "@contracts/quran";

function arabicSize(length: number, scale: number): string {
  const preset =
    length > 700
      ? [1.3, 3.8, 2.1]
      : length > 350
        ? [1.55, 4.6, 2.5]
        : length > 180
          ? [1.85, 5.6, 3]
          : [2.5, 8.2, 4.4];
  return `clamp(${preset[0] * scale}rem, ${preset[1] * scale}vw, ${preset[2] * scale}rem)`;
}

type Props = {
  ayah: Ayah;
  chapter: Chapter;
  isActive: boolean;
  activeWord: number;
  fontScale: number;
  showTransliteration: boolean;
  onUnderstand: () => void;
};

export function AyahView({
  ayah,
  chapter,
  isActive,
  activeWord,
  fontScale,
  showTransliteration,
  onUnderstand,
}: Props) {
  return (
    <article
      id={`ayah-${ayah.verseKey.replace(":", "-")}`}
      data-verse-key={ayah.verseKey}
      className="ayah-panel flex h-[100dvh] snap-start snap-always items-center justify-center px-6 pb-32 pt-24 sm:px-12"
      aria-label={`${chapter.nameSimple}, ayah ${ayah.verseNumber}`}
    >
      <button
        type="button"
        onClick={onUnderstand}
        className="ayah-content group flex max-h-full w-full max-w-3xl cursor-pointer flex-col items-center overflow-y-auto rounded-2xl px-1 py-4 text-center outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.995]"
        aria-label={`Understand ${chapter.nameSimple} ayah ${ayah.verseNumber}`}
      >
        <div className="mb-7 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--muted)] sm:mb-9">
          <span>{chapter.nameSimple}</span>
          <span className="h-px w-5 bg-[var(--line)]" aria-hidden="true" />
          <span>Ayah {ayah.verseNumber}</span>
        </div>

        {ayah.arabic.length > 500 && (
          <span className="mb-5 text-xs leading-5 text-[var(--muted)]">
            Scroll within this long ayah to continue reading
          </span>
        )}

        <p
          lang="ar"
          dir="rtl"
          className="quran-arabic w-full text-[var(--cream)]"
          style={{ fontSize: arabicSize(ayah.arabic.length, fontScale) }}
        >
          {ayah.words.length > 0
            ? ayah.words.map((word) => (
                <span
                  key={`${ayah.verseKey}-${word.position}`}
                  className={`quran-word ${
                    isActive && activeWord === word.position - 1
                      ? "quran-word-active"
                      : ""
                  }`}
                >
                  {word.text}{" "}
                </span>
              ))
            : ayah.arabic}
        </p>

        <div className="mt-8 flex w-16 items-center gap-2 opacity-70 sm:mt-10" aria-hidden="true">
          <span className="h-px flex-1 bg-[var(--gold)]" />
          <span className="h-1 w-1 rotate-45 bg-[var(--gold)]" />
          <span className="h-px flex-1 bg-[var(--gold)]" />
        </div>

        <p
          lang="en"
          className="mt-7 max-w-[62ch] text-balance text-base leading-[1.75] text-[var(--cream-soft)] sm:mt-8 sm:text-lg"
          style={{ fontSize: `${fontScale}em` }}
        >
          {ayah.translation}
        </p>

        {showTransliteration && ayah.transliteration && (
          <p
            lang="en"
            className="mt-5 max-w-[62ch] text-sm leading-7 text-[var(--muted)]"
          >
            {ayah.transliteration}
          </p>
        )}

        <span
          className={`mt-7 inline-flex min-h-11 items-center gap-2 text-xs tracking-wide text-[var(--muted)] transition-opacity duration-200 group-hover:text-[var(--cream)] ${
            isActive ? "opacity-100" : "opacity-0"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Tap to understand
        </span>
      </button>
    </article>
  );
}
