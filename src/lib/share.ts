/** Share links carry only the verse key: no feeling, no streak, no tracking parameters. */
export function ayahPath(verseKey: string): string {
  const [surah, ayah] = verseKey.split(":");
  return `/${Number(surah)}/${Number(ayah)}`;
}

export function trimText(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

export function shareData(origin: string, verseKey: string, chapterName: string, translation: string) {
  return {
    title: `Surah ${chapterName} ${verseKey}`,
    text: `“${trimText(translation, 120)}” — Surah ${chapterName} ${verseKey}`,
    url: `${origin}${ayahPath(verseKey)}`,
  };
}
