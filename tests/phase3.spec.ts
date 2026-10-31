import { expect, test } from "./fixtures";

async function openReader(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

test("reader loads static surah data without chapter API requests", async ({ page }) => {
  const chapterApiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("quran.chapter") || request.url().includes("quran.chapters")) {
      chapterApiRequests.push(request.url());
    }
  });
  await openReader(page);
  const staticResponse = await page.request.get("/data/surah/13.json");
  expect(staticResponse.ok()).toBe(true);
  const feed = await staticResponse.json();
  expect(feed.chapter.id).toBe(13);
  expect(feed.verses).toHaveLength(43);
  expect(chapterApiRequests).toEqual([]);
});

test("manifest, maskable icons, app shell, and opened surah are cached", async ({ page }) => {
  await openReader(page);
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  const data = await manifest.json();
  expect(data.name).toBe("Scroll The Quran");
  expect(data.display).toBe("standalone");
  expect(data.icons.every((icon: { purpose: string }) => icon.purpose.includes("maskable"))).toBe(true);
  expect((await page.request.get("/icons/icon-192.png")).ok()).toBe(true);
  expect((await page.request.get("/icons/icon-512.png")).ok()).toBe(true);

  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/data/chapters.json")))).toBe(true);
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/data/surah/1.json")))).toBe(true);
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/index.html")))).toBe(true);
});

test("a previously opened surah and played recitation work offline", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openReader(page);
  await page.getByRole("button", { name: "Choose another surah" }).click();
  await page.getByPlaceholder("Name, number, or 2:255").fill("Al-Baqarah");
  await page.getByRole("listitem").filter({ hasText: "Al-Baqarah" }).click();
  await expect(page.locator('article[data-verse-key="2:1"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Play recitation" }).click();
  await page.waitForFunction(() => (document.querySelector("audio")?.currentTime ?? 0) > 0.1);
  await expect.poll(() => page.evaluate(async () => {
    const response = await caches.match("/audio/7/002001.mp3");
    return response?.status === 200;
  }), { timeout: 45_000 }).toBe(true);
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/data/surah/2.json")))).toBe(true);

  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator('article[data-verse-key="2:1"] .quran-arabic')).toBeVisible();
  await expect(page.locator("header")).toContainText("1 / 286");
  await page.getByRole("button", { name: "Play recitation" }).click();
  await page.waitForFunction(() => (document.querySelector("audio")?.currentTime ?? 0) > 0.1);
  expect(errors).toEqual([]);
  await page.context().setOffline(false);
});

test("iOS install guidance appears on the second visit and stays dismissed", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("scroll-quran:visit-count", "1");
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1",
    });
  });
  await openReader(page);
  const card = page.getByRole("complementary", { name: "Install Scroll The Quran" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Tap Share in Safari.");
  await expect(card).toContainText("Choose Add to Home Screen.");
  await page.getByRole("button", { name: "Dismiss install guide" }).click();
  await expect(card).toBeHidden();
  await page.reload();
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await expect(card).toHaveCount(0);
});

test("native install prompt installs once and never shows the card again", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("scroll-quran:visit-count", "1"));
  await openReader(page);
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  const card = page.getByRole("complementary", { name: "Install Scroll The Quran" });
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: "Install Scroll Quran" }).click();
  await expect(card).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("scroll-quran:installed"))).toBe("true");
  await page.reload();
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await expect(card).toHaveCount(0);
});
