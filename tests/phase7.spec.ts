import type { Page } from "@playwright/test";
import UPNG from "upng-js";
import { expect, test } from "./fixtures";

const SCENES = ["fajr", "day", "maghrib", "night"] as const;
const TINTS = ["calm", "warm", "cool", "rising", "bright"] as const;

function luminance(r: number, g: number, b: number) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Brightest background pixel behind the ayah text (text hidden), as a luminance. */
async function backgroundPeak(page: Page): Promise<number> {
  const box = await page.locator('article[data-verse-key="1:1"] .ayah-content').boundingBox();
  await page.addStyleTag({ content: ".ayah-content{visibility:hidden!important}" });
  const png = await page.screenshot({ clip: box!, animations: "disabled" });
  await page.addStyleTag({ content: ".ayah-content{visibility:visible!important}" });
  const img = UPNG.decode(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer);
  const rgba = new Uint8Array(UPNG.toRGBA8(img)[0]);
  let peak = 0;
  for (let i = 0; i < rgba.length; i += 4) peak = Math.max(peak, luminance(rgba[i], rgba[i + 1], rgba[i + 2]));
  return peak;
}

async function textLuminance(page: Page, selector: string) {
  const rgb = await page.locator(selector).first().evaluate((el) => {
    const canvas = document.createElement("canvas").getContext("2d")!;
    canvas.fillStyle = getComputedStyle(el).color;
    canvas.fillRect(0, 0, 1, 1);
    return Array.from(canvas.getImageData(0, 0, 1, 1).data.slice(0, 3));
  });
  return luminance(rgb[0], rgb[1], rgb[2]);
}

test("time-of-day scenes and feeling tints can be previewed", async ({ page }) => {
  for (const scene of SCENES) {
    await page.goto(`/1/1?scene=${scene}`);
    await expect(page.getByTestId("scene")).toHaveAttribute("data-scene", scene);
  }
  await page.goto("/1/1?scene=night&tint=calm");
  await expect(page.getByTestId("scene")).toHaveAttribute("data-tint", "calm");
  await page.goto("/1/1?tint=unknown");
  await expect(page.getByTestId("scene")).not.toHaveAttribute("data-tint", /.+/);
});

test("ayah text keeps WCAG AA contrast over every scene and tint", async ({ page }) => {
  const cases = [...SCENES.map((s) => `scene=${s}`), ...TINTS.map((t) => `scene=day&tint=${t}`)];
  for (const query of cases) {
    await page.goto(`/1/1?${query}`);
    await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
    await page.waitForTimeout(2600); // let colour cross-fades settle
    const bg = await backgroundPeak(page);
    const translation = await textLuminance(page, 'article[data-verse-key="1:1"] p[lang="en"]');
    const ratio = (translation + 0.05) / (bg + 0.05);
    expect(ratio, `translation contrast for ${query}`).toBeGreaterThanOrEqual(4.5);
  }
});

test("parallax layers shift as the reader moves between ayahs", async ({ page }) => {
  await page.goto("/1/1");
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  const read = () => page.getByTestId("scene").evaluate((el) => getComputedStyle(el).getPropertyValue("--p-mid").trim());
  expect(await read()).toBe("0px");
  await page.getByRole("button", { name: "Next ayah" }).click();
  await expect.poll(read).not.toBe("0px");
});

test("scene animation pauses when the tab is hidden", async ({ page }) => {
  await page.goto("/1/1");
  await expect(page.getByTestId("scene")).not.toHaveAttribute("data-paused", /.*/);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("scene")).toHaveAttribute("data-paused", "true");
});

for (const scene of SCENES) {
  test(`visual snapshot: ${scene}`, async ({ page }) => {
    await page.goto(`/1/1?scene=${scene}`);
    await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2600);
    await expect(page).toHaveScreenshot(`scene-${scene}.png`, { animations: "disabled", maxDiffPixelRatio: 0.02 });
  });
}

for (const tint of TINTS) {
  test(`visual snapshot: tint ${tint}`, async ({ page }) => {
    await page.goto(`/1/1?scene=day&tint=${tint}`);
    await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2600);
    await expect(page).toHaveScreenshot(`tint-${tint}.png`, { animations: "disabled", maxDiffPixelRatio: 0.02 });
  });
}

test("visual snapshot: reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/1/1?scene=day");
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await expect(page.locator(".scene-mote").first()).toBeHidden();
  await expect(page).toHaveScreenshot("reduced-motion.png", { maxDiffPixelRatio: 0.02 });
});
