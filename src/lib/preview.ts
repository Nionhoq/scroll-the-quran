/**
 * Static preview build (VITE_PREVIEW=1): runs without the server, e.g. as a hosted demo page.
 * Paths are relative, routing is in-memory, and only bundled recitations/tafsir are available.
 */
export const IS_PREVIEW = import.meta.env.VITE_PREVIEW === "1";

type PreviewManifest = { audio: string[]; tafsir: string[] };
let manifest: Promise<PreviewManifest> | null = null;

export function previewManifest(): Promise<PreviewManifest> {
  manifest ??= fetch("./preview/manifest.json")
    .then((response) => (response.ok ? (response.json() as Promise<PreviewManifest>) : { audio: [], tafsir: [] }))
    .catch(() => ({ audio: [], tafsir: [] }));
  return manifest;
}
