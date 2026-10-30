/**
 * Runtime settings the server injects into index.html as <meta> tags
 * (inline scripts are blocked by our Content-Security-Policy).
 */
function meta(name: string): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content.trim() ?? "";
}

/** External donation page, or "" when not configured (the link is then hidden). */
export function supportUrl(): string {
  const value = meta("scroll-quran:support-url");
  return /^https:\/\//i.test(value) ? value : "";
}
