import { describe, expect, it } from "vitest";
import { buildPreview, escapeHtml, injectHead, parsePreviewPath, previewTags, trimDescription } from "./ogMeta";

const counts: Record<number, number> = { 1: 7, 13: 43, 114: 6 };
const lookup = (s: number) => counts[s];

describe("preview routes", () => {
  it("parses surah and ayah paths and rejects everything else", () => {
    expect(parsePreviewPath("/13/28", lookup)).toEqual({ surah: 13, ayah: 28 });
    expect(parsePreviewPath("/13", lookup)).toEqual({ surah: 13, ayah: null });
    expect(parsePreviewPath("/13/28/", lookup)).toEqual({ surah: 13, ayah: 28 });
    expect(parsePreviewPath("/13/44", lookup)).toBeNull();
    expect(parsePreviewPath("/13/0", lookup)).toBeNull();
    expect(parsePreviewPath("/115/1", lookup)).toBeNull();
    expect(parsePreviewPath("/privacy", lookup)).toBeNull();
    expect(parsePreviewPath("/13/28?x=1", lookup)).toBeNull();
  });
});

describe("preview tags", () => {
  const preview = buildPreview({
    origin: "https://scrollquran.org",
    surah: 13,
    ayah: 28,
    chapterName: "Ar-Ra'd",
    translatedName: "The Thunder",
    versesCount: 43,
    translation: "Those who have believed and whose hearts are assured by the remembrance of Allāh. Unquestionably, by the remembrance of Allāh hearts are assured.",
  });

  it("builds title, trimmed description, absolute url and image", () => {
    expect(preview.title).toBe("Surah Ar-Ra'd 13:28");
    expect(preview.url).toBe("https://scrollquran.org/13/28");
    expect(preview.image).toBe("https://scrollquran.org/og/13-28.png");
    expect(preview.description.length).toBeLessThanOrEqual(150);
  });

  it("escapes everything it writes", () => {
    const tags = previewTags(preview);
    expect(tags).toContain('content="Surah Ar-Ra&#39;d 13:28"');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
  });

  it("uses a surah description when no ayah is given", () => {
    const surah = buildPreview({ origin: "https://a.b", surah: 1, ayah: null, chapterName: "Al-Fatihah", translatedName: "The Opener", versesCount: 7 });
    expect(surah.title).toBe("Surah Al-Fatihah");
    expect(surah.image).toBe("https://a.b/og/1-1.png");
    expect(surah.description).toContain("The Opener · 7 ayahs");
  });

  it("injects into index.html, replacing title and description", () => {
    const html = `<head>\n<meta name="description" content="old" />\n<title>Scroll The Quran</title>\n</head>`;
    const out = injectHead(html, { supportUrl: "https://example.org/give", preview });
    expect(out).toContain("<title>Surah Ar-Ra&#39;d 13:28 · Scroll The Quran</title>");
    expect(out).toContain('og:image" content="https://scrollquran.org/og/13-28.png"');
    expect(out).toContain('name="scroll-quran:support-url" content="https://example.org/give"');
    expect(out).not.toContain('content="old"');
  });

  it("ignores a non-https support url", () => {
    expect(injectHead("<head></head>", { supportUrl: "javascript:alert(1)", preview: null })).toBe("<head></head>");
  });

  it("trims on a word boundary", () => {
    expect(trimDescription("a b c")).toBe("a b c");
    expect(trimDescription("word ".repeat(60)).endsWith("…")).toBe(true);
  });
});
