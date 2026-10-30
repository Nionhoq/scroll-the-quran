import { describe, expect, it } from "vitest";
import { canShowInstallCard } from "./install";

const eligible = {
  visits: 2,
  dismissed: false,
  installed: false,
  standalone: false,
  isIOS: true,
  canPrompt: false,
};

describe("install card visibility", () => {
  it("waits for the second visit and supports iOS guidance", () => {
    expect(canShowInstallCard({ ...eligible, visits: 1 })).toBe(false);
    expect(canShowInstallCard(eligible)).toBe(true);
  });

  it("requires a native prompt outside iOS", () => {
    expect(canShowInstallCard({ ...eligible, isIOS: false })).toBe(false);
    expect(canShowInstallCard({ ...eligible, isIOS: false, canPrompt: true })).toBe(true);
  });

  it("never returns after dismissal, installation, or in standalone mode", () => {
    expect(canShowInstallCard({ ...eligible, dismissed: true })).toBe(false);
    expect(canShowInstallCard({ ...eligible, installed: true })).toBe(false);
    expect(canShowInstallCard({ ...eligible, standalone: true })).toBe(false);
  });
});
