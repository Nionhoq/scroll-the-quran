import { Link, useNavigate } from "react-router";
import { AyahSetReader } from "@/components/AyahSetReader";

/** A set of ayahs someone sent. We don't know why they sent it, and don't ask. */
export default function SharedSet({ verses }: { verses: string[] }) {
  const navigate = useNavigate();
  return (
    <AyahSetReader
      verses={verses}
      backLabel="Quran"
      backAria="Open the Quran reader"
      onBack={() => navigate("/")}
      ariaLabel={`${verses.length} ayahs shared with you`}
      ending={
        <>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Shared with you</p>
          <p className="mt-5 max-w-xs text-lg leading-8 text-[var(--cream-soft)]">Someone thought of you. Take a moment with these whenever you need.</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/feel" className="min-h-12 rounded-full border border-[var(--line)] px-6 py-3 text-sm outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">How do you feel?</Link>
            <Link to="/" className="min-h-12 rounded-full px-6 py-3 text-sm text-[var(--muted)] outline-none hover:text-[var(--cream)] focus-visible:ring-2 focus-visible:ring-[var(--gold)]">Read one ayah a day</Link>
          </div>
        </>
      }
    />
  );
}
