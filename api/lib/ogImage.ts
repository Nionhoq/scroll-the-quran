import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire as createModuleRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import UPNG from "upng-js";

/**
 * 1200x630 link-preview image for one ayah. Text is shaped with HarfBuzz (the same shaper
 * browsers use) and drawn as glyph outlines, so Arabic renders exactly as in the app.
 * Content is sourced Quran text and Sahih International only; nothing is generated.
 */

const requireModule = createModuleRequire(import.meta.url);
const W = 1200;
const H = 630;

type HbFont = { glyphToPath(id: number): string; destroy?: () => void };
type Shaper = { font: HbFont; upem: number };
type HbBuffer = { addText(text: string): void; guessSegmentProperties(): void; json(): Array<{ g: number; ax: number; dx: number; dy: number }>; destroy(): void };
type HarfBuzz = {
  createBlob(data: Uint8Array): unknown;
  createFace(blob: unknown, index: number): { upem: number };
  createFont(face: unknown): HbFont;
  createBuffer(): HbBuffer;
  shape(font: HbFont, buffer: HbBuffer): void;
};

function fontPath(file: string): string {
  const candidates = [
    path.resolve(process.cwd(), "api/assets/fonts", file),
    path.resolve(process.cwd(), "dist/assets/fonts", file),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

let shapers: Promise<{ hb: HarfBuzz; arabic: Shaper; latin: Shaper }> | null = null;

function loadShapers() {
  shapers ??= (async () => {
    const hb = (await requireModule("harfbuzzjs")) as HarfBuzz;
    const load = async (file: string): Promise<Shaper> => {
      const face = hb.createFace(hb.createBlob(await fs.readFile(fontPath(file))), 0);
      return { font: hb.createFont(face), upem: face.upem };
    };
    return { hb, arabic: await load("UthmanicHafs.ttf"), latin: await load("HankenGrotesk.ttf") };
  })();
  return shapers;
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

export async function renderOgSvg(input: OgInput): Promise<string> {
  const { hb, arabic, latin } = await loadShapers();
  const maxWidth = 1040;

  // Pick the largest Arabic size that fits in three lines.
  let size = 64;
  const wrapArabic = (s: number) => wrapWords(input.arabic.split(" "), maxWidth, 3, (t) => shape(hb, arabic, t, s).width, false);
  let ar = wrapArabic(size);
  for (const next of [56, 48, 42]) {
    if (!ar.truncated) break;
    size = next;
    ar = wrapArabic(size);
  }
  if (ar.truncated) {
    // The Quran font has no ellipsis glyph: make room on the last line for one drawn in the Latin font.
    const room = maxWidth - shape(hb, latin, " …", size * 0.7).width - 12;
    let last = ar.lines[ar.lines.length - 1];
    while (last.includes(" ") && shape(hb, arabic, last, size).width > room) last = last.slice(0, last.lastIndexOf(" "));
    ar.lines[ar.lines.length - 1] = last;
  }
  const arLine = size * 1.75;
  const trSize = 28;
  const tr = wrapWords(input.translation.replace(/\s+/g, " ").trim().split(" "), maxWidth, 3, (t) => shape(hb, latin, t, trSize).width);
  const trLine = trSize * 1.5;

  const blockHeight = ar.lines.length * arLine + 56 + tr.lines.length * trLine;
  let y = Math.max(70, (540 - blockHeight) / 2 + 20);
  const parts: string[] = [];

  ar.lines.forEach((line, index) => {
    const run = shape(hb, arabic, line, size);
    const isLastTruncated = ar.truncated && index === ar.lines.length - 1;
    const dots = isLastTruncated ? shape(hb, latin, "…", size * 0.7) : null;
    const total = run.width + (dots ? dots.width + 12 : 0);
    const left = (W - total) / 2;
    const baseline = y + size * 1.2;
    // RTL: the ayah continues to the left, so the ellipsis sits at the left end.
    if (dots) parts.push(`<g fill="#d6a243" transform="translate(${left.toFixed(1)} ${baseline.toFixed(1)})">${dots.paths}</g>`);
    parts.push(`<g fill="#f3ebe0" transform="translate(${(left + (dots ? dots.width + 12 : 0)).toFixed(1)} ${baseline.toFixed(1)})">${run.paths}</g>`);
    y += arLine;
  });
  y += 18;
  parts.push(`<g transform="translate(${W / 2} ${y})" fill="#d6a243"><rect x="-44" y="-0.75" width="32" height="1.5"/><rect x="12" y="-0.75" width="32" height="1.5"/><rect x="-4" y="-4" width="8" height="8" transform="rotate(45)"/></g>`);
  y += 38;
  for (const line of tr.lines) {
    const run = shape(hb, latin, line, trSize);
    parts.push(`<g fill="#d8cfc2" transform="translate(${((W - run.width) / 2).toFixed(1)} ${(y + trSize).toFixed(1)})">${run.paths}</g>`);
    y += trLine;
  }

  const ref = shape(hb, latin, `Surah ${input.chapterName} · ${input.verseKey}`, 24);
  const brand = shape(hb, latin, "Scroll The Quran", 24);

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
  <g fill="#a8998a" transform="translate(80 586)">${ref.paths}</g>
  <g fill="#d6a243" transform="translate(${(W - 80 - brand.width).toFixed(1)} 586)">${brand.paths}</g>
</svg>`;
}

export async function renderOgPng(input: OgInput): Promise<Uint8Array> {
  const svg = await renderOgSvg(input);
  const image = new Resvg(svg, { font: { loadSystemFonts: false } }).render();
  // Quantize to 256 colours: keeps previews well under WhatsApp's ~300 KB limit.
  const rgba = image.pixels.buffer.slice(image.pixels.byteOffset, image.pixels.byteOffset + image.pixels.byteLength) as ArrayBuffer;
  return new Uint8Array(UPNG.encode([rgba], image.width, image.height, 256));
}
