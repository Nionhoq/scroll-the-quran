import { supportUrl } from "@/lib/runtimeConfig";

/** Small, quiet link to the external donation page. Hidden when SUPPORT_URL is not set. */
export function SupportLink({ className = "" }: { className?: string }) {
  const href = supportUrl();
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4 outline-none transition-colors hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${className}`}
    >
      Support Scroll Quran
    </a>
  );
}
