import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import UPNG from "upng-js";
import uthmaniFont from "../api/assets/fonts/UthmanicHafs.ttf";
import hankenFont from "../api/assets/fonts/HankenGrotesk.ttf";
import { buildOgSvg, type OgInput, type TextEngine } from "../api/lib/ogCore";

/**
 * Worker: preview images via resvg-wasm, which shapes text itself (rustybuzz, a HarfBuzz port).
 * harfbuzzjs cannot run here: its JS wrapper compiles wasm at runtime, which Workers forbid.
 */

const FAMILIES = { arabic: "KFGQPC HAFS Uthmanic Script", latin: "Hanken Grotesk" } as const;
const fontBuffers = [new Uint8Array(uthmaniFont), new Uint8Array(hankenFont)];

let ready: Promise<void> | null = null;
function init() {
  ready ??= initWasm(resvgWasm);
  return ready;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function textElement(font: keyof typeof FAMILIES, text: string, size: number, x: number, y: number, fill: string) {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="${FAMILIES[font]}" font-size="${size}" fill="${fill}">${escapeXml(text)}</text>`;
}

const widthCache = new Map<string, number>();

const resvgEngine: TextEngine = {
  measure(font, text, size) {
    const key = `${font}|${size}|${text}`;
    const hit = widthCache.get(key);
    if (hit !== undefined) return hit;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400">${textElement(font, text, size, 2000, 200, "#000")}</svg>`;
    const r = new Resvg(svg, { font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: FAMILIES.latin } });
    const width = r.innerBBox()?.width ?? 0;
    r.free();
    if (widthCache.size > 5000) widthCache.clear();
    widthCache.set(key, width);
    return width;
  },
  draw(font, text, size, centerX, baseline, fill) {
    return textElement(font, text, size, centerX, baseline, fill);
  },
};

export async function renderOgPng(input: OgInput): Promise<Uint8Array> {
  await init();
  const svg = buildOgSvg(resvgEngine, input);
  const resvg = new Resvg(svg, { font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: FAMILIES.latin } });
  const image = resvg.render();
  const pixels = image.pixels;
  const rgba = pixels.buffer.slice(pixels.byteOffset, pixels.byteOffset + pixels.byteLength) as ArrayBuffer;
  const png = new Uint8Array(UPNG.encode([rgba], image.width, image.height, 256));
  image.free();
  resvg.free();
  return png;
}
