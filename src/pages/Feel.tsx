import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ExternalLink, MessageCircle, Phone } from "lucide-react";
import type { Feeling, FeelingsFile } from "@contracts/feelings";
import feelingsData from "@/data/feelings.json";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AyahSetReader } from "@/components/AyahSetReader";

const FEELINGS = (feelingsData as FeelingsFile).feelings;
const UNDER_REVIEW = (feelingsData as FeelingsFile).reviewStatus !== "approved";

/**
 * "How do you feel?" — tap a feeling, read a few hand-picked ayahs.
 * The chosen feeling lives only in this component's memory: it is never stored,
 * never sent to the server, and never placed in a URL.
 */
export default function Feel() {
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [crisis, setCrisis] = useState(false);

  if (crisis) return <CrisisScreen onBack={() => setCrisis(false)} />;
  if (feeling) {
    const back = () => setFeeling(null);
    return (
      <AyahSetReader
        verses={feeling.verses}
        tint={feeling.id}
        backLabel="Feelings"
        backAria="Back to feelings"
        onBack={back}
        ariaLabel="Ayahs for how you feel"
        ending={
          <>
            <p className="text-lg text-[var(--cream-soft)]">Take a breath. You can return any time.</p>
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/" className="min-h-12 rounded-full border border-[var(--line)] px-6 py-3 text-sm outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">Return to reading</Link>
              <button type="button" onClick={back} className="min-h-12 cursor-pointer rounded-full px-6 text-sm text-[var(--muted)] outline-none hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">Choose another feeling</button>
            </div>
          </>
        }
      />
    );
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-x-hidden bg-[var(--canvas)] text-[var(--cream)]">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <Link to="/" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full text-sm text-[var(--cream-soft)] outline-none hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to reading
        </Link>

        <div className="my-auto py-8">
          <p className="brand-mark text-[11px] text-[var(--gold)]">COMFORT AND CLARITY</p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.03em]">How do you feel?</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Choose one. A few ayahs will follow, one at a time. Your choice stays on this screen only.</p>

          <div className="mt-8 grid grid-cols-2 gap-3" role="group" aria-label="Feelings">
            {FEELINGS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFeeling(item)}
                className="min-h-16 cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--panel)]/70 px-4 text-left text-base text-[var(--cream)] outline-none backdrop-blur-sm transition-colors duration-150 hover:border-[var(--gold)] hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCrisis(true)}
            className="mt-4 flex min-h-16 w-full cursor-pointer items-center justify-center rounded-2xl border border-[oklch(0.75_0.09_25/0.6)] bg-[oklch(0.3_0.05_25/0.35)] px-4 text-base font-medium text-[var(--cream)] outline-none transition-colors hover:bg-[oklch(0.35_0.06_25/0.45)] focus-visible:ring-2 focus-visible:ring-[var(--cream)]"
          >
            I’m not okay
          </button>

          {UNDER_REVIEW && (
            <p className="mt-6 text-center text-xs text-[var(--muted)]" data-testid="review-note">
              Selection under scholarly review.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function CrisisScreen({ onBack }: { onBack: () => void }) {
  useEffect(() => {
    document.getElementById("crisis-heading")?.focus();
  }, []);
  const action =
    "flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 text-base text-[var(--cream)] outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]";
  return (
    <main className="relative isolate min-h-[100dvh] bg-[var(--canvas)] text-[var(--cream)]">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full text-sm text-[var(--cream-soft)] outline-none hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
        <section className="my-auto py-8" aria-labelledby="crisis-heading">
          <h1 id="crisis-heading" tabIndex={-1} className="text-3xl font-medium leading-tight tracking-[-0.02em] outline-none">
            You don’t have to carry this alone.
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--cream-soft)]">
            If you’re thinking about harming yourself or you’re in crisis, please reach out now.
          </p>
          <div className="mt-8 space-y-3">
            <a href="tel:988" className={action}>
              <Phone className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Call 9-8-8</span><span className="block text-xs text-[var(--muted)]">Suicide Crisis Helpline · Canada</span></span>
            </a>
            <a href="sms:988" className={action}>
              <MessageCircle className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Text 9-8-8</span><span className="block text-xs text-[var(--muted)]">Canada</span></span>
            </a>
            <a href="tel:911" className={action}>
              <Phone className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Emergency: 911</span><span className="block text-xs text-[var(--muted)]">If you or someone is in immediate danger</span></span>
            </a>
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={action}>
              <ExternalLink className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
              <span><span className="font-medium">Outside Canada</span><span className="block text-xs text-[var(--muted)]">Find a helpline at findahelpline.com</span></span>
            </a>
          </div>
          <p className="mt-6 text-sm leading-6 text-[var(--muted)]">Talking to someone you trust—family, a friend, or your imam—can help too.</p>
        </section>
      </div>
    </main>
  );
}

