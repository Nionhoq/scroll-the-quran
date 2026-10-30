export type QuranSource = "Quran Foundation" | "Quran.com";

export type Chapter = {
  id: number;
  nameSimple: string;
  nameArabic: string;
  translatedName: string;
  versesCount: number;
  revelationPlace: string;
};

export type QuranWord = {
  position: number;
  text: string;
  translation: string;
  transliteration: string | null;
};

/** [zero-based word index, segment index, start ms, end ms] */
export type AudioSegment = [number, number, number, number];

export type Ayah = {
  id: number;
  verseKey: string;
  verseNumber: number;
  arabic: string;
  translation: string;
  transliteration: string;
  audioUrl: string | null;
  segments: AudioSegment[];
  words: QuranWord[];
};

export type ChapterFeed = {
  chapter: Chapter;
  verses: Ayah[];
  source: QuranSource;
  translationName: string;
  reciterName: string;
};

export type TafsirExcerpt = {
  verseKey: string;
  title: string;
  excerpt: string;
  sourceUrl: string;
  source: QuranSource;
};
