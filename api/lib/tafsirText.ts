import type { QuranSource, TafsirExcerpt } from "@contracts/quran";

/** Platform-free text helpers shared by the Node server and the Cloudflare Worker. */

export function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&#039;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&mdash;": "—",
    "&ndash;": "–",
  };
  let text = value;
  for (const [entity, replacement] of Object.entries(entities)) {
    text = text.replaceAll(entity, replacement);
  }
  return text.replace(/&#(\d+);/g, (_, code: string) =>
    String.fromCodePoint(Number(code)),
  );
}

export function plainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
      .replace(/<\/(?:p|h[1-6]|div|li|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function makeExcerpt(verseKey: string, html: string, source: QuranSource): TafsirExcerpt {
  const fullText = plainText(html);
  const limit = 1100;
  let excerpt = fullText;
  if (fullText.length > limit) {
    const cutoff = fullText.lastIndexOf(" ", limit);
    excerpt = `${fullText.slice(0, cutoff > 700 ? cutoff : limit).trim()}…`;
  }
  return {
    verseKey,
    title: "Ibn Kathir (Abridged)",
    excerpt,
    sourceUrl: `https://quran.com/${verseKey}/tafsirs/en-tafisr-ibn-kathir`,
    source,
  };
}

