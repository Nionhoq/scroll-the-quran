import { expect, test, type Page } from "./fixtures";

async function jump(page: Page, query: string, verseKey: string) {
  await page.getByRole("button", { name: "Choose another surah" }).click();
  await page.getByPlaceholder("Name, number, or 2:255").fill(query);
  await page.getByTestId("jump-to-ayah").first().click();
  await expect(page.locator(`[data-verse-key="${verseKey}"] .quran-arabic`)).toBeVisible({ timeout: 45_000 });
}

test("save ayahs and come back to any of them in one tap, in the order saved", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();

  await jump(page, "2:255", "2:255");
  await page.getByRole("button", { name: "Save Al-Baqarah 2:255" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await expect(page.getByTestId("save-ayah")).toHaveAttribute("aria-pressed", "true");

  await jump(page, "2:285", "2:285");
  await page.getByRole("button", { name: "Save Al-Baqarah 2:285" }).click();
  await jump(page, "3:196", "3:196");
  await page.getByRole("button", { name: "Save Ali 'Imran 3:196" }).click();

  // Somewhere else entirely, then reload: the list is still there.
  await jump(page, "40:38", "40:38");
  await page.reload();
  await expect(page.locator('[data-verse-key="40:38"] .quran-arabic')).toBeVisible({ timeout: 45_000 });

  await page.getByRole("button", { name: "Choose another surah" }).click();
  const saved = page.getByTestId("saved-ayahs");
  await expect(saved.getByRole("button", { name: /^Go to saved/ })).toHaveText([
    "Al-Baqarah 2:255",
    "Al-Baqarah 2:285",
    "Ali 'Imran 3:196",
  ]);
  await saved.getByRole("button", { name: "Go to saved Al-Baqarah 2:255" }).click();
  await expect(page.locator('[data-verse-key="2:255"] .quran-arabic')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("header")).toContainText("255 / 286");
  await expect(page.getByTestId("save-ayah")).toHaveAttribute("aria-pressed", "true");
});

test("un-save from the player or from the list", async ({ page }) => {
  await page.goto("/1/1");
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Save Al-Fatihah 1:1" }).click();
  await page.getByRole("button", { name: "Remove Al-Fatihah 1:1 from saved" }).click();
  await expect(page.getByRole("status")).toHaveText("Removed from saved");
  await expect(page.getByTestId("save-ayah")).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Save Al-Fatihah 1:1" }).click();
  await page.getByRole("button", { name: "Choose another surah" }).click();
  const saved = page.getByTestId("saved-ayahs");
  await saved.getByRole("button", { name: "Remove Al-Fatihah 1:1 from saved" }).click();
  await expect(saved).toContainText("Tap the bookmark");
  await page.getByRole("button", { name: "Close surah navigator" }).click();
  await expect(page.getByTestId("save-ayah")).toHaveAttribute("aria-pressed", "false");
});

test("an ayah saved from a feeling shows up in the surah list", async ({ page }) => {
  await page.goto("/feel");
  await page.getByRole("button", { name: "Stressed", exact: true }).click();
  await expect(page.locator('[data-verse-key="13:28"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Save Ar-Ra'd 13:28" }).click();
  await page.goto("/");
  await page.getByRole("button", { name: "Choose another surah" }).click();
  await expect(page.getByTestId("saved-ayahs").getByRole("button", { name: "Go to saved Ar-Ra'd 13:28" })).toBeVisible();
});
