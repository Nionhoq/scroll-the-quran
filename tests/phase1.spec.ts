import { expect, test } from "./fixtures";

async function openReader(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
}

test("audio dock keeps the correct total duration after advancing", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Play recitation" }).click();
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  await expect(page.locator(".audio-dock")).not.toContainText("/ 0:00");

  await page.getByRole("button", { name: "Next ayah" }).click();
  await expect(page.locator("header")).toContainText("2 / 7");
  await page.waitForFunction(() => document.querySelector("audio")?.src.includes("001002.mp3"));
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  await expect(page.locator(".audio-dock")).toContainText("1:2");
  await expect(page.locator(".audio-dock")).not.toContainText("/ 0:00");
});

test("tafsir drawer follows the ayah when audio auto-advances", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Understand Al-Fatihah ayah 1" }).click();
  await page.getByRole("button", { name: "Play this ayah" }).click();
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && !audio.paused && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  await page.locator("audio").evaluate((audio) => {
    audio.currentTime = Math.max(0, audio.duration - 0.15);
  });

  await expect(page.locator("header")).toContainText("2 / 7");
  await expect(page.getByRole("dialog")).toContainText("Al-Fatihah · 2");
  await expect(page.getByRole("tabpanel", { name: "Tafsir excerpt" })).toBeVisible();
});

test("deep links open a specific surah and ayah directly", async ({ page }) => {
  await page.goto("/13/28");
  await expect(page.locator('article[data-verse-key="13:28"] .quran-arabic')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("header")).toContainText("28 / 43");
  await expect.poll(() => page.locator(".quran-feed").evaluate((feed) => Math.round(feed.scrollTop / feed.clientHeight))).toBe(27);
});

test("surah-only links work and invalid keys redirect home", async ({ page }) => {
  await page.goto("/2");
  await expect(page.locator('article[data-verse-key="2:1"] .quran-arabic')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("header")).toContainText("1 / 286");

  await page.evaluate(() => localStorage.clear());
  await page.goto("/999/2");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
});

test("audio dock reserves clearance for host-level floating badges", async ({ page }) => {
  await openReader(page);
  const padding = await page.locator(".audio-dock").evaluate((dock) => parseFloat(getComputedStyle(dock.parentElement ?? dock).paddingBottom));
  expect(padding).toBeGreaterThanOrEqual(48);
});
