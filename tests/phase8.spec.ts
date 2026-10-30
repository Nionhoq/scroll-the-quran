import { expect, test } from "./fixtures";

test("support link appears in settings and opens the external page in a new tab", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reading settings" }).click();
  const link = page.getByRole("dialog").getByRole("link", { name: "Support Scroll Quran" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://example.org/support");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

test("support link is a quiet line on the done card, never a pop-up", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Understand Al-Fatihah ayah 1" }).click();
  await page.waitForTimeout(6_000);
  await page.keyboard.press("Escape");
  const card = page.getByRole("status", { name: "Done for today" });
  await expect(card.getByRole("link", { name: "Support Scroll Quran" })).toHaveAttribute("href", "https://example.org/support");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("popups stay fully on screen", async ({ page }) => {
  const viewport = page.viewportSize()!;
  await page.goto("/");
  for (const [open, close] of [
    ["Choose another surah", "Close surah navigator"],
    ["Reading settings", "Close reading settings"],
  ]) {
    await page.getByRole("button", { name: open }).click();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box, open).not.toBeNull();
    expect(box!.y, open).toBeGreaterThanOrEqual(0);
    expect(box!.x, open).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, open).toBeLessThanOrEqual(viewport.height + 1);
    await page.getByRole("button", { name: close }).click();
  }
});
