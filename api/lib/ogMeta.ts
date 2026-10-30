/** Builds the link-preview tags injected into index.html for shared ayah links. */

export type PreviewTarget = { surah: number; ayah: number | null };

const ROUTE = /^\/(\d{1,3})(?:\/(\d{1,3}))?\/?$/;

/** Parses /13 and /13/28. Returns null for anything else or out-of-range numbers. */
export function parsePreviewPath(pathname: string, versesCount: (surah: number) => number | undefined): PreviewTarget | null {
  const match = ROUTE.exec(pathname);
  if (!match) return null;
  const surah = Number(match[1]);
  const count = versesCount(surah);
  if (!count) return null;
  if (match[2] === undefined) return { surah, ayah: null };
  const ayah = Number(match[2]);
  return ayah >= 1 && ayah <= count ? { surah, ayah } : null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function trimDescription(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

export type PreviewInput = {
  origin: string;
  surah: number;
  ayah: number | null;
  chapterName: string;
  translatedName: string;
  versesCount: number;
  translation?: string;
};

export type Preview = { title: string; description: string; url: string; image: string };

export function buildPreview(input: PreviewInput): Preview {
  const key = input.ayah ? `${input.surah}:${input.ayah}` : null;
  const title = key ? `Surah ${input.chapterName} ${key}` : `Surah ${input.chapterName}`;
  const description = key && input.translation
    ? trimDescription(input.translation)
    : `${input.translatedName} · ${input.versesCount} ayahs. Read one ayah at a time, with recitation and tafsir.`;
  const path = key ? `/${input.surah}/${input.ayah}` : `/${input.surah}`;
  return {
    title,
    description,
    url: `${input.origin}${path}`,
    image: `${input.origin}/og/${input.surah}-${input.ayah ?? 1}.png`,
  };
}

export const SITE_NAME = "Scroll The Quran";

export function previewTags(preview: Preview): string {
  const t = escapeHtml(preview.title);
  const d = escapeHtml(preview.description);
  const u = escapeHtml(preview.url);
  const i = escapeHtml(preview.image);
  return [
    `<link rel="canonical" href="${u}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:image" content="${i}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${t}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${i}" />`,
  ].join("\n    ");
}

/** Injects runtime config + optional preview tags into index.html. */
export function injectHead(html: string, options: { supportUrl: string; preview: Preview | null }): string {
  const tags: string[] = [];
  if (/^https:\/\//i.test(options.supportUrl)) {
    tags.push(`<meta name="scroll-quran:support-url" content="${escapeHtml(options.supportUrl)}" />`);
  }
  let out = html;
  if (options.preview) {
    tags.push(previewTags(options.preview));
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(options.preview.title)} · ${SITE_NAME}</title>`);
    out = out.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(options.preview.description)}" />`,
    );
  }
  return tags.length ? out.replace("</head>", `    ${tags.join("\n    ")}\n  </head>`) : out;
}
