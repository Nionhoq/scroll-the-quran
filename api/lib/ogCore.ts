/**
 * Platform-free core of the 1200x630 link-preview image (shared by the Node server and the
 * Cloudflare Worker). Text is shaped with HarfBuzz and drawn as glyph outlines, so Arabic renders
 * exactly as in the app. Content is sourced Quran text and Sahih International only.
 */

const W = 1200;
const H = 630;

export type HbFont = { glyphToPath(id: number): string; destroy?: () => void };
export type Shaper = { font: HbFont; upem: number };
export type HbBuffer = { addText(text: string): void; guessSegmentProperties(): void; json(): Array<{ g: number; ax: number; dx: number; dy: number }>; destroy(): void };
export type HarfBuzz = {
  createBlob(data: Uint8Array): unknown;
  createFace(blob: unknown, index: number): { upem: number };
  createFont(face: unknown): HbFont;
  createBuffer(): HbBuffer;
  shape(font: HbFont, buffer: HbBuffer): void;
};

export function loadShaper(hb: HarfBuzz, font: Uint8Array): Shaper {
  const face = hb.createFace(hb.createBlob(font), 0);
  return { font: hb.createFont(face), upem: face.upem };
}

type Run = { width: number; paths: string };

function shape(hb: HarfBuzz, shaper: Shaper, text: string, size: number): Run {
  const buffer = hb.createBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(shaper.font, buffer);
  const glyphs = buffer.json();
  buffer.destroy();
  const k = size / shaper.upem;
  let x = 0;
  const parts: string[] = [];
  for (const glyph of glyphs) {
    const d = shaper.font.glyphToPath(glyph.g);
    if (d) parts.push(`<path transform="translate(${((x + glyph.dx) * k).toFixed(2)} ${(-glyph.dy * k).toFixed(2)}) scale(${k.toFixed(5)} ${(-k).toFixed(5)})" d="${d}"/>`);
    x += glyph.ax;
  }
  return { width: x * k, paths: parts.join("") };
}

/** Text drawing used by the preview layout. Positions are centre-anchored. */
export type TextEngine = {
  measure(font: "arabic" | "latin", text: string, size: number): number;
  draw(font: "arabic" | "latin", text: string, size: number, centerX: number, baseline: number, fill: string): string;
};

/** HarfBuzz engine (Node): exact shaping, drawn as glyph outlines. */
export function harfbuzzEngine(engine: { hb: HarfBuzz; arabic: Shaper; latin: Shaper }): TextEngine {
  const pick = (font: "arabic" | "latin") => (font === "arabic" ? engine.arabic : engine.latin);
  return {
    measure: (font, text, size) => shape(engine.hb, pick(font), text, size).width,
    draw: (font, text, size, centerX, baseline, fill) => {
      const run = shape(engine.hb, pick(font), text, size);
      return `<g fill="${fill}" transform="translate(${(centerX - run.width / 2).toFixed(1)} ${baseline.toFixed(1)})">${run.paths}</g>`;
    },
  };
}

/** Greedy word wrap using real shaped widths. Adds an ellipsis when it runs out of lines. */
export function wrapWords(
  words: string[],
  maxWidth: number,
  maxLines: number,
  measure: (text: string) => number,
  ellipsis = true,
): { lines: string[]; truncated: boolean } {
  const lines: string[] = [];
  let current = "";
  let i = 0;
  for (; i < words.length; i += 1) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (measure(candidate) <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = words[i];
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
    current = "";
    i = words.length;
  }
  const truncated = i < words.length || current !== "";
  if (truncated && ellipsis && lines.length) {
    let last = lines[lines.length - 1];
    while (last.includes(" ") && measure(`${last} …`) > maxWidth) last = last.slice(0, last.lastIndexOf(" "));
    lines[lines.length - 1] = `${last} …`;
  }
  return { lines, truncated };
}

const LATTICE =
  "M60 12 69 36 93 27 84 51 108 60 84 69 93 93 69 84 60 108 51 84 27 93 36 69 12 60 36 51 27 27 51 36Z M60 36 77 43 84 60 77 77 60 84 43 77 36 60 43 43Z M60 0V12M108 60H120M60 108V120M0 60H12M0 0 27 27M93 27 120 0M93 93 120 120M0 120 27 93";

export type OgInput = { arabic: string; translation: string; chapterName: string; verseKey: string };

export function buildOgSvg(text: TextEngine, input: OgInput): string {
  const maxWidth = 1040;

  // Pick the largest Arabic size that fits in three lines.
  let size = 64;
  const wrapArabic = (s: number) => wrapWords(input.arabic.split(" "), maxWidth, 3, (t) => text.measure("arabic", t, s), false);
  let ar = wrapArabic(size);
  for (const next of [56, 48, 42]) {
    if (!ar.truncated) break;
    size = next;
    ar = wrapArabic(size);
  }
  if (ar.truncated) {
    // The Quran font has no ellipsis glyph: make room on the last line for one drawn in the Latin font.
    const room = maxWidth - text.measure("latin", " …", size * 0.7) - 12;
    let last = ar.lines[ar.lines.length - 1];
    while (last.includes(" ") && text.measure("arabic", last, size) > room) last = last.slice(0, last.lastIndexOf(" "));
    ar.lines[ar.lines.length - 1] = last;
  }
  const arLine = size * 1.75;
  const trSize = 28;
  const tr = wrapWords(input.translation.replace(/\s+/g, " ").trim().split(" "), maxWidth, 3, (t) => text.measure("latin", t, trSize));
  const trLine = trSize * 1.5;

  const blockHeight = ar.lines.length * arLine + 56 + tr.lines.length * trLine;
  let y = Math.max(70, (540 - blockHeight) / 2 + 20);
  const parts: string[] = [];

  ar.lines.forEach((line, index) => {
    const runWidth = text.measure("arabic", line, size);
    const isLastTruncated = ar.truncated && index === ar.lines.length - 1;
    const dotsWidth = isLastTruncated ? text.measure("latin", "…", size * 0.7) : 0;
    const total = runWidth + (isLastTruncated ? dotsWidth + 12 : 0);
    const left = (W - total) / 2;
    const baseline = y + size * 1.2;
    // RTL: the ayah continues to the left, so the ellipsis sits at the left end.
    if (isLastTruncated) parts.push(text.draw("latin", "…", size * 0.7, left + dotsWidth / 2, baseline, "#d6a243"));
    parts.push(text.draw("arabic", line, size, left + (isLastTruncated ? dotsWidth + 12 : 0) + runWidth / 2, baseline, "#f3ebe0"));
    y += arLine;
  });
  y += 18;
  parts.push(`<g transform="translate(${W / 2} ${y})" fill="#d6a243"><rect x="-44" y="-0.75" width="32" height="1.5"/><rect x="12" y="-0.75" width="32" height="1.5"/><rect x="-4" y="-4" width="8" height="8" transform="rotate(45)"/></g>`);
  y += 38;
  for (const line of tr.lines) {
    parts.push(text.draw("latin", line, trSize, W / 2, y + trSize, "#d8cfc2"));
    y += trLine;
  }

  const refText = `Surah ${input.chapterName} · ${input.verseKey}`;
  const refWidth = text.measure("latin", refText, 24);
  const brandWidth = text.measure("latin", "Scroll The Quran", 24);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241c15"/><stop offset="1" stop-color="#110e0b"/></linearGradient>
    <radialGradient id="glow" cx="0.86" cy="-0.05" r="0.75"><stop offset="0" stop-color="#e9d6a8" stop-opacity="0.55"/><stop offset="1" stop-color="#e9d6a8" stop-opacity="0"/></radialGradient>
    <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.6"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="poolMask"><rect x="560" y="-260" width="900" height="620" fill="url(#pool)"/></mask>
    <pattern id="lattice" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-14) skewX(8)"><path d="${LATTICE}" fill="none" stroke="#241c15" stroke-width="9" stroke-linejoin="round"/></pattern>
    <radialGradient id="scrim" cx="0.5" cy="0.48" r="0.6"><stop offset="0" stop-color="#120f0c" stop-opacity="0.72"/><stop offset="1" stop-color="#120f0c" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g mask="url(#poolMask)" opacity="0.55"><rect width="${W}" height="${H}" fill="#e9d6a8"/><rect width="${W}" height="${H}" fill="url(#lattice)"/></g>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  ${parts.join("\n  ")}
  ${text.draw("latin", refText, 24, 80 + refWidth / 2, 586, "#a8998a")}
  ${text.draw("latin", "Scroll The Quran", 24, W - 80 - brandWidth / 2, 586, "#d6a243")}
</svg>`;
}

