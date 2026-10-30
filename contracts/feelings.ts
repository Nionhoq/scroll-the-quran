export const FEELING_IDS = ["stressed", "anxious", "sad", "lonely", "angry", "hopeless", "grateful", "lost"] as const;
export type FeelingId = (typeof FEELING_IDS)[number];

export type Feeling = { id: FeelingId; label: string; verses: string[] };
export type FeelingsFile = { reviewStatus: string; note?: string; feelings: Feeling[] };

/**
 * Returns a list of problems (empty = valid). `versesCount` maps a surah number to its ayah count,
 * so every key is checked against the real Quran data.
 */
export function validateFeelings(file: FeelingsFile, versesCount: (surah: number) => number | undefined): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const feeling of file.feelings) {
    if (!FEELING_IDS.includes(feeling.id)) problems.push(`unknown feeling id: ${feeling.id}`);
    if (seen.has(feeling.id)) problems.push(`duplicate feeling: ${feeling.id}`);
    seen.add(feeling.id);
    if (!feeling.label.trim()) problems.push(`${feeling.id}: empty label`);
    if (feeling.verses.length < 3 || feeling.verses.length > 7) {
      problems.push(`${feeling.id}: needs 3-7 verses, has ${feeling.verses.length}`);
    }
    if (new Set(feeling.verses).size !== feeling.verses.length) problems.push(`${feeling.id}: duplicate verse`);
    for (const key of feeling.verses) {
      const match = /^(\d{1,3}):(\d{1,3})$/.exec(key);
      const count = match ? versesCount(Number(match[1])) : undefined;
      if (!match || !count || Number(match[2]) < 1 || Number(match[2]) > count) {
        problems.push(`${feeling.id}: ${key} is not a valid verse`);
      }
    }
  }
  for (const id of FEELING_IDS) if (!seen.has(id)) problems.push(`missing feeling: ${id}`);
  return problems;
}
