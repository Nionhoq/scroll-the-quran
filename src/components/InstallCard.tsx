import { useEffect, useState } from "react";
import { Download, Plus, Share, X } from "lucide-react";
import { canShowInstallCard } from "@/lib/install";

const VISITS_KEY = "scroll-quran:visit-count";
const DISMISSED_KEY = "scroll-quran:install-dismissed";
const INSTALLED_KEY = "scroll-quran:installed";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function storedBoolean(key: string) {
  return localStorage.getItem(key) === "true";
}

function detectStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallCard() {
  const [visits, setVisits] = useState(() => Number(localStorage.getItem(VISITS_KEY) ?? 0));
  const [dismissed, setDismissed] = useState(() => storedBoolean(DISMISSED_KEY));
  const [installed, setInstalled] = useState(() => storedBoolean(INSTALLED_KEY));
  const [standalone] = useState(detectStandalone);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next = Math.min(2, Math.max(0, Number(localStorage.getItem(VISITS_KEY) ?? 0)) + 1);
      localStorage.setItem(VISITS_KEY, String(next));
      setVisits(next);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!canShowInstallCard({
    visits,
    dismissed,
    installed,
    standalone,
    isIOS,
    canPrompt: Boolean(promptEvent),
  })) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
      setInstalled(true);
    }
    setPromptEvent(null);
  };

  return (
    <aside className="fixed inset-x-4 bottom-[172px] z-40 mx-auto max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 text-[var(--cream)] shadow-2xl sm:left-auto sm:right-8" aria-label="Install Scroll The Quran">
      <button type="button" onClick={dismiss} className="icon-button absolute right-2 top-2" aria-label="Dismiss install guide">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="pr-8 text-sm font-medium">Keep one ayah within reach.</p>
      {isIOS ? (
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs leading-5 text-[var(--cream-soft)]">
          <div className="border-t border-[var(--gold)] pt-3">
            <Share className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
            <p className="mt-2">Tap <strong>Share</strong> in Safari.</p>
          </div>
          <div className="border-t border-[var(--gold)] pt-3">
            <Plus className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
            <p className="mt-2">Choose <strong>Add to Home Screen</strong>.</p>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => void install()} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--gold)] px-5 text-sm font-medium text-[var(--canvas)] outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-[var(--cream)] active:scale-[0.98]">
          <Download className="h-4 w-4" aria-hidden="true" />
          Install Scroll Quran
        </button>
      )}
    </aside>
  );
}
