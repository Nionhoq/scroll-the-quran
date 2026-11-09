import { useSyncExternalStore } from "react";
import { versesCount } from "@/lib/versesCount";

/**
 * Saved ayahs ("bookmarks"), kept only on this device. Stored as verse keys ("2:255") in the
 * order they were saved, so a reader's first saved ayah stays first.
 */

const KEY = "scroll-quran:saved";
export const SAVED_MAX = 100;

const listeners = new Set<() => void>();
let cache: string[] | null = null;

function valid(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(key);
  if (!match) return false;
  const count = versesCount(Number(match[1]));
  const ayah = Number(match[2]);
  return Boolean(count) && ayah >= 1 && ayah <= (count ?? 0);
}

function load(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(valid))].slice(0, SAVED_MAX);
  } catch {
    return [];
  }
}

const EMPTY: string[] = [];

export function getSaved(): string[] {
  cache ??= load();
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked or full: the list still works until the page closes.
  }
  listeners.forEach((listener) => listener());
}

export function isSaved(key: string): boolean {
  return getSaved().includes(key);
}

/** Saves or un-saves an ayah. Returns true if it is now saved. */
export function toggleSaved(key: string): boolean {
  if (!valid(key)) return false;
  const current = getSaved();
  if (current.includes(key)) {
    write(current.filter((item) => item !== key));
    return false;
  }
  write([...current, key].slice(-SAVED_MAX));
  return true;
}

export function removeSaved(key: string) {
  write(getSaved().filter((item) => item !== key));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab of the app changed the list.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSavedAyahs(): string[] {
  return useSyncExternalStore(subscribe, getSaved, () => EMPTY);
}

/** For tests. */
export function resetSavedCache() {
  cache = null;
}
