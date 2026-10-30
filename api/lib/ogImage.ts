import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire as createModuleRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import UPNG from "upng-js";
import { buildOgSvg, harfbuzzEngine, loadShaper, type HarfBuzz, type OgInput, type Shaper } from "./ogCore";

export { wrapWords, type OgInput } from "./ogCore";

/** Node server: preview images via harfbuzzjs + native resvg. */
const requireModule = createModuleRequire(import.meta.url);

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
    const load = async (file: string): Promise<Shaper> => loadShaper(hb, new Uint8Array(await fs.readFile(fontPath(file))));
    return { hb, arabic: await load("UthmanicHafs.ttf"), latin: await load("HankenGrotesk.ttf") };
  })();
  return shapers;
}

export async function renderOgSvg(input: OgInput): Promise<string> {
  return buildOgSvg(harfbuzzEngine(await loadShapers()), input);
}

export async function renderOgPng(input: OgInput): Promise<Uint8Array> {
  const svg = await renderOgSvg(input);
  const image = new Resvg(svg, { font: { loadSystemFonts: false } }).render();
  // Quantize to 256 colours: keeps previews well under WhatsApp's ~300 KB limit.
  const rgba = image.pixels.buffer.slice(image.pixels.byteOffset, image.pixels.byteOffset + image.pixels.byteLength) as ArrayBuffer;
  return new Uint8Array(UPNG.encode([rgba], image.width, image.height, 256));
}
