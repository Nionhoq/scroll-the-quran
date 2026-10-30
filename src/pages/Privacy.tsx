import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { AmbientBackground } from "@/components/AmbientBackground";

export default function Privacy() {
  return (
    <main className="relative isolate min-h-[100dvh] overflow-x-hidden bg-[var(--canvas)] text-[var(--cream)]">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-6 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-10">
        <Link
          to="/"
          className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full text-sm text-[var(--cream-soft)] outline-none transition-colors hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to reading
        </Link>

        <article className="my-auto max-w-[65ch] py-10">
          <p className="brand-mark text-[11px] text-[var(--gold)]">PRIVACY, IN PLAIN WORDS</p>
          <h1 className="mt-5 text-4xl font-medium leading-[1.08] tracking-[-0.035em] sm:text-5xl">
            Your reading stays yours.
          </h1>
          <p className="mt-6 text-base leading-7 text-[var(--cream-soft)]">
            No accounts. No advertising. No tracking across apps or websites. We do not set cookies.
          </p>

          <div className="mt-9 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            <section className="py-5">
              <h2 className="text-base font-medium">On your phone</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Your last-read ayah, reading days, and settings stay in this browser. They are not sent to us or added to links. Clearing browser data removes them.
              </p>
            </section>
            <section className="py-5">
              <h2 className="text-base font-medium">One anonymous daily count</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Once a day, the app sends only a broad reading group: new, 1, 2–7, 8–30, or 31+ days. It has no name, ID, reading history, or precise time. It simply helps us understand daily use.
              </p>
            </section>
            <section className="py-5">
              <h2 className="text-base font-medium">Nothing follows you</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Fonts, Quran content, and recitation load from this site—not from third-party services. Nothing here syncs between devices.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
