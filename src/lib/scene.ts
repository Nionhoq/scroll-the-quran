import type { FeelingId } from "@contracts/feelings";

/** Time-of-day scenes for the "light through a mashrabiya" background. */
export type Scene = "fajr" | "day" | "maghrib" | "night";
/** Feeling tints. Named by palette, never by feeling, so preview URLs carry no feelings. */
export type Tint = "calm" | "warm" | "cool" | "rising" | "bright";

export const SCENES: Scene[] = ["fajr", "day", "maghrib", "night"];
export const TINTS: Tint[] = ["calm", "warm", "cool", "rising", "bright"];

/** Approximate local-clock windows (no location or prayer-time lookup, by design). */
export function sceneForHour(hour: number): Scene {
  if (hour >= 4 && hour < 7) return "fajr";
  if (hour >= 7 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "maghrib";
  return "night";
}

const FEELING_TINT: Record<FeelingId, Tint> = {
  stressed: "calm",
  anxious: "calm",
  sad: "warm",
  lonely: "warm",
  angry: "cool",
  hopeless: "rising",
  lost: "rising",
  grateful: "bright",
};

export function tintForFeeling(feeling: FeelingId | undefined): Tint | null {
  return feeling ? FEELING_TINT[feeling] : null;
}

/**
 * Light intensity 0..1. The "rising" tint starts dim and brightens as the reader moves
 * through the ayahs; everything else is steady.
 */
export function lightIntensity(tint: Tint | null, progress = 0): number {
  const p = Math.min(1, Math.max(0, progress));
  if (tint === "rising") return 0.3 + 0.7 * p;
  if (tint === "cool") return 0.55;
  return 1;
}

/** Gentle parallax offset (px) for a layer as the reader moves between ayahs. */
export function parallaxOffset(index: number, depth: number): number {
  return Math.round(Math.sin(index * 0.9) * depth * 10) / 10;
}

/** Dev/screenshot preview: ?scene=fajr|day|maghrib|night and ?tint=calm|warm|cool|rising|bright */
export function previewOverrides(search: string): { scene: Scene | null; tint: Tint | null } {
  const params = new URLSearchParams(search);
  const scene = params.get("scene");
  const tint = params.get("tint");
  return {
    scene: SCENES.includes(scene as Scene) ? (scene as Scene) : null,
    tint: TINTS.includes(tint as Tint) ? (tint as Tint) : null,
  };
}

/** Feeling tint (when in the feelings flow) overrides time of day. */
export function resolveScene(options: { hour: number; feeling?: FeelingId; search?: string }) {
  const preview = previewOverrides(options.search ?? "");
  return {
    scene: preview.scene ?? sceneForHour(options.hour),
    tint: preview.tint ?? tintForFeeling(options.feeling),
  };
}
