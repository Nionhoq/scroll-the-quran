import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

async function openReader(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
}

async function expectPosition(page: Page, chapter: number, ayah: number, count: number) {
  await expect(page.locator("header")).toContainText(`${ayah} / ${count}`);
  await expect(page.locator(`article[data-verse-key="${chapter}:${ayah}"]`)).toHaveClass(/ayah-panel/);
  await expect.poll(() => page.locator(".quran-feed").evaluate((feed) => Math.round(feed.scrollTop / feed.clientHeight))).toBe(ayah - 1);
}

test("loads Al-Fatihah 1:1 with sourced Arabic, translation, and understanding entry", async ({ page }) => {
  await openReader(page);

  const arabic = page.locator('[data-verse-key="1:1"] .quran-arabic');
  await expect(arabic).toHaveAttribute("dir", "rtl");
  await expect(arabic).toContainText("بِسْمِ");
  await expect(page.locator('article[data-verse-key="1:1"]')).toContainText("In the name of Allāh");
  await expect(page.getByRole("button", { name: "Understand Al-Fatihah ayah 1" })).toContainText("Tap to understand");
});

test("plays recitation, highlights the current word, and pauses", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Play recitation" }).click();
  await expect(page.getByRole("button", { name: "Pause recitation" })).toBeVisible();
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && !audio.paused && audio.currentTime > 0.1;
  });
  await expect(page.locator('[data-verse-key="1:1"] .quran-word-active').first()).toBeVisible();
  await page.getByRole("button", { name: "Pause recitation" }).click();
  await expect(page.getByRole("button", { name: "Play recitation" })).toBeVisible();
  expect(await page.locator("audio").evaluate((audio) => audio.paused)).toBe(true);
});

test("auto-advances to the next ayah when recitation ends", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Play recitation" }).click();
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && !audio.paused && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  await page.locator("audio").evaluate((audio) => {
    audio.currentTime = Math.max(0, audio.duration - 0.15);
  });

  await expectPosition(page, 1, 2, 7);
  await page.waitForFunction(() => document.querySelector("audio")?.src.includes("001002.mp3"));
  expect(await page.locator("audio").evaluate((audio) => audio.paused)).toBe(false);
});

test("next/previous, arrow/j/k keys, and scroll snap move between ayahs", async ({ page }) => {
  await openReader(page);

  await page.getByRole("button", { name: "Next ayah" }).click();
  await expectPosition(page, 1, 2, 7);
  await page.getByRole("button", { name: "Previous ayah" }).click();
  await expectPosition(page, 1, 1, 7);

  const feed = page.locator(".quran-feed");
  await feed.focus();
  await feed.press("ArrowDown");
  await expectPosition(page, 1, 2, 7);
  await feed.press("j");
  await expectPosition(page, 1, 3, 7);
  await feed.press("k");
  await expectPosition(page, 1, 2, 7);
  await feed.press("ArrowUp");
  await expectPosition(page, 1, 1, 7);

  await feed.evaluate((element) => {
    element.scrollTo({ top: element.clientHeight, behavior: "auto" });
  });
  await expectPosition(page, 1, 2, 7);
});

test("opens sourced tafsir and word meanings for the current ayah, then closes", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Understand Al-Fatihah ayah 1" }).click();
  await expect(page.getByRole("tabpanel", { name: "Tafsir excerpt" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the full tafsir on Quran.com" })).toBeVisible();
  expect((await page.getByRole("tabpanel", { name: "Tafsir excerpt" }).innerText()).length).toBeGreaterThan(100);

  await page.getByRole("tab", { name: "Word by word" }).click();
  await expect(page.getByRole("tabpanel", { name: "Word by word meanings" })).toBeVisible();
  expect(await page.getByRole("tabpanel", { name: "Word by word meanings" }).locator(".divide-y > div").count()).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tablist", { name: "Understanding options" })).toBeHidden();
});

test("surah picker searches and switches to Surah 2", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Choose another surah" }).click();
  await page.getByPlaceholder("Search by name or number").fill("Al-Baqarah");
  await page.getByRole("listitem").filter({ hasText: "Al-Baqarah" }).click();
  await expect(page.locator('[data-verse-key="2:1"] .quran-arabic')).toBeVisible({ timeout: 45_000 });
  await expectPosition(page, 2, 1, 286);
});

test("transliteration and text size persist after reload", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Reading settings" }).click();
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "Large", exact: true }).click();
  await page.getByRole("button", { name: "Close reading settings" }).click();

  await expect.poll(() => page.evaluate(() => localStorage.getItem("scroll-quran:transliteration"))).toBe("true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("scroll-quran:font-scale"))).toBe("1.12");
  await page.reload();
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Reading settings" }).click();
  await expect(page.getByRole("switch")).toBeChecked();
  await expect(page.getByRole("button", { name: "Large", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("restores the last-read ayah and scroll position after reload", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Next ayah" }).click();
  await expectPosition(page, 1, 2, 7);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("scroll-quran:last-read") ?? "{}").verseKey)).toBe("1:2");

  await page.reload();
  await expect(page.locator('[data-verse-key="1:2"] .quran-arabic')).toBeVisible();
  await expectPosition(page, 1, 2, 7);
  await expect.poll(() => page.locator(".quran-feed").evaluate((feed) => Math.round(feed.scrollTop / feed.clientHeight))).toBe(1);
});

test("reduced motion stops the ambient scene", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openReader(page);

  await expect(page.locator(".ambient-pattern")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".ambient-rays")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".ambient-particle").first()).toBeHidden();
});
