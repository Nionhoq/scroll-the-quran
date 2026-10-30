import { describe, expect, it } from "vitest";
import { FEELING_IDS } from "@contracts/feelings";
import { lightIntensity, parallaxOffset, previewOverrides, resolveScene, sceneForHour, tintForFeeling } from "./scene";

describe("scene selection", () => {
  it("follows the local clock", () => {
    expect(sceneForHour(3)).toBe("night");
    expect(sceneForHour(4)).toBe("fajr");
    expect(sceneForHour(6)).toBe("fajr");
    expect(sceneForHour(7)).toBe("day");
    expect(sceneForHour(16)).toBe("day");
    expect(sceneForHour(17)).toBe("maghrib");
    expect(sceneForHour(19)).toBe("maghrib");
    expect(sceneForHour(20)).toBe("night");
    expect(sceneForHour(0)).toBe("night");
  });

  it("maps every feeling to a tint, and the tint overrides time of day", () => {
    for (const id of FEELING_IDS) expect(tintForFeeling(id)).not.toBeNull();
    expect(tintForFeeling("stressed")).toBe("calm");
    expect(tintForFeeling("grateful")).toBe("bright");
    expect(resolveScene({ hour: 12 })).toEqual({ scene: "day", tint: null });
    expect(resolveScene({ hour: 12, feeling: "angry" })).toEqual({ scene: "day", tint: "cool" });
  });

  it("brightens the rising tint with progress and keeps others steady", () => {
    expect(lightIntensity("rising", 0)).toBeCloseTo(0.3);
    expect(lightIntensity("rising", 1)).toBe(1);
    expect(lightIntensity("rising", 5)).toBe(1);
    expect(lightIntensity("calm", 0)).toBe(1);
    expect(lightIntensity("cool", 0.5)).toBe(0.55);
  });

  it("accepts only known preview params, which never name a feeling", () => {
    expect(previewOverrides("?scene=fajr&tint=calm")).toEqual({ scene: "fajr", tint: "calm" });
    expect(previewOverrides("?scene=noon&tint=stressed")).toEqual({ scene: null, tint: null });
    expect(resolveScene({ hour: 12, feeling: "sad", search: "?scene=night" })).toEqual({ scene: "night", tint: "warm" });
  });

  it("keeps parallax small and deterministic", () => {
    expect(parallaxOffset(0, 12)).toBe(0);
    for (let i = 0; i < 300; i += 1) expect(Math.abs(parallaxOffset(i, 12))).toBeLessThanOrEqual(12);
  });
});
