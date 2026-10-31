import { ayahPath, trimText } from "@/lib/share";

/**
 * A shared set of ayahs travels in the link's #fragment, which browsers never send to a server.
 * The server only ever sees the first ayah's path (/13/28), exactly like a single-ayah share, so
 * it cannot work out which feeling the set came from. The feeling itself is never in the link.
 */

export const SET_MIN = 2;
export const SET_MAX = 7;

const KEY = /^(\d{1,3}):(\d{1,3})$/;

export function setFragment(keys: string[]): string {
  return `#set=${keys.map((key) => key.replace(":", "-")).join(".")}`;
}

/** Returns the verse keys in a #set= fragment, or null when it is not a valid set. */
export function parseSetFragment(hash: string, versesCount?: (surah: number) => number | undefined): string[] | null {
  const match = /^#set=([\d.-]{3,60})$/.exec(hash);
  if (!match) return null;
  const keys = match[1].split(".").map((part) => part.replace("-", ":"));
  if (keys.length < SET_MIN || keys.length > SET_MAX || new Set(keys).size !== keys.length) return null;
  for (const key of keys) {
    const parts = KEY.exec(key);
    if (!parts) return null;
    const surah = Number(parts[1]);
    const ayah = Number(parts[2]);
    if (surah < 1 || surah > 114 || ayah < 1) return null;
    if (versesCount) {
      const count = versesCount(surah);
      if (!count || ayah > count) return null;
    }
  }
  return keys;
}

export function setShareData(origin: string, keys: string[], firstTranslation: string) {
  const url = `${origin}${ayahPath(keys[0])}${setFragment(keys)}`;
  return {
    title: `${keys.length} ayahs for you`,
    text: `A few ayahs I wanted to share with you. “${trimText(firstTranslation, 90)}”`,
    url,
  };
}
