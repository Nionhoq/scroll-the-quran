import { supportUrl } from "@/lib/runtimeConfig";

/** Small, quiet link to the external donation page. Hidden when SUPPORT_URL is not set. */
export function SupportLink({ className = "" }: { className?: string }) {
  const href = supportUrl();
  if (!href) return null;
  return (
    <span className={`flex flex-col items-center gap-1 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4 outline-none transition-colors hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
      >
        Support Scroll Quran
      </a>
      <span className="text-[11px] text-[var(--muted)]">
        Helps cover hosting and recitation costs.
      </span>
    </span>
  );
}
