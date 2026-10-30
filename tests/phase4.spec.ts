import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function openReader(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator("article.ayah-panel .quran-arabic").first()).toBeVisible();
}

function localDay(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("opening the drawer for 5 seconds completes today's ayah, calmly", async ({ page }) => {
  await openReader(page);
  await expect(page.getByTestId("gentle-streak")).toHaveText(/0\/7/);
  await page.getByRole("button", { name: "Understand Al-Fatihah ayah 1" }).click();
  await expect(page.getByRole("tablist", { name: "Understanding options" })).toBeVisible();

  await page.waitForTimeout(6_000);
  await page.keyboard.press("Escape");
  const card = page.getByRole("status", { name: "Done for today" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Al-Fatihah · 1:1");
  await expect(card).toContainText("1 of the last 7 days");
  await expect(card).not.toContainText(/streak lost|don't break|confetti/i);
  await expect(page.getByTestId("gentle-streak")).toHaveText(/1\/7/);

  const stored = await page.evaluate(() => ({
    days: JSON.parse(localStorage.getItem("scroll-quran:completed-days") ?? "[]"),
    last: localStorage.getItem("scroll-quran:last-completed"),
  }));
  expect(stored.days).toEqual([localDay()]);
  expect(stored.last).toBe("1:1");
});

test("finishing a recitation completes today's ayah and 'Read one more' moves on", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Play recitation" }).click();
  await page.waitForFunction(() => {
    const audio = document.querySelector("audio");
    return audio && !audio.paused && Number.isFinite(audio.duration) && audio.duration > 0;
  });
  await page.locator("audio").evaluate((audio) => {
    audio.currentTime = Math.max(0, audio.duration - 0.15);
  });
  const card = page.getByRole("status", { name: "Done for today" });
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: "Pause recitation" }).click();
  await card.getByRole("button", { name: /Read one more/ }).click();
  await expect(card).toBeHidden();
  await expect(page.locator("header")).toContainText("3 / 7");
});

test("the card appears only once per day, and the habit survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((today) => {
    localStorage.setItem("scroll-quran:completed-days", JSON.stringify([today]));
  }, localDay());
  await openReader(page);
  await expect(page.getByTestId("gentle-streak")).toHaveText(/1\/7/);
  await expect(page.getByTestId("gentle-streak")).toHaveAttribute("aria-label", /done for today/);
  await page.getByRole("button", { name: "Understand Al-Fatihah ayah 1" }).click();
  await page.waitForTimeout(6_500);
  await expect(page.getByRole("status", { name: "Done for today" })).toHaveCount(0);
});

test("missing a day lowers the week count instead of resetting it", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((days) => {
    localStorage.setItem("scroll-quran:completed-days", JSON.stringify(days));
  }, [localDay(-6), localDay(-5), localDay(-4), localDay(-3), localDay(-1)]);
  await openReader(page);
  await expect(page.getByTestId("gentle-streak")).toHaveText(/5\/7/);
  await expect(page.getByTestId("gentle-streak")).toHaveAttribute("aria-label", /5 of the last 7 days/);
});

test("daily ayah time is a quiet label that persists and never asks for notifications", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Reading settings" }).click();
  await page.getByRole("group", { name: "Daily ayah time" }).getByRole("button", { name: "After Fajr" }).click();
  await page.getByRole("button", { name: "Close reading settings" }).click();
  await expect(page.getByTestId("anchor-reminder")).toHaveText("Today’s ayah · After Fajr");
  await page.reload();
  await expect(page.getByTestId("anchor-reminder")).toHaveText("Today’s ayah · After Fajr");
  expect(await page.evaluate(() => Notification.permission)).toBe("default");
});
