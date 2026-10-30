import { expect, test } from "./fixtures";

const FEELINGS = ["Stressed", "Anxious", "Sad", "Lonely", "Angry", "Hopeless", "Grateful", "Lost"];

test("feelings screen opens from the reader with eight feelings, a crisis option and the review note", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "How do you feel?" }).click();
  await expect(page).toHaveURL(/\/feel$/);
  await expect(page.getByRole("heading", { name: "How do you feel?" })).toBeVisible();
  const group = page.getByRole("group", { name: "Feelings" });
  for (const label of FEELINGS) await expect(group.getByRole("button", { name: label, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "I’m not okay" })).toBeVisible();
  await expect(page.getByTestId("review-note")).toHaveText("Selection under scholarly review.");
});

test("a feeling opens its ayahs one at a time, tinted, with nothing stored or put in the URL", async ({ page }) => {
  await page.goto("/feel");
  await page.getByRole("button", { name: "Stressed", exact: true }).click();
  await expect(page.locator('[data-verse-key="13:28"] .quran-arabic')).toBeVisible();
  await expect(page.getByTestId("feeling-progress")).toHaveText("1 / 4");
  await expect(page.getByTestId("scene")).toHaveAttribute("data-tint", "calm");
  await expect(page).toHaveURL(/\/feel$/);

  await page.getByRole("button", { name: "Next ayah" }).click();
  await expect(page.getByTestId("feeling-progress")).toHaveText("2 / 4");
  await expect(page.locator('[data-verse-key="94:5"] .quran-arabic')).toBeVisible();

  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).toLowerCase());
  for (const label of FEELINGS) expect(stored).not.toContain(label.toLowerCase());
  expect(page.url().toLowerCase()).not.toContain("stressed");

  await page.getByRole("button", { name: "Back to feelings" }).click();
  await expect(page.getByRole("heading", { name: "How do you feel?" })).toBeVisible();
});

test("each feeling loads all of its ayahs", async ({ page }) => {
  const expected: Record<string, number> = { Anxious: 3, Hopeless: 3, Grateful: 3, Lost: 3 };
  for (const [label, count] of Object.entries(expected)) {
    await page.goto("/feel");
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByTestId("feeling-progress")).toHaveText(`1 / ${count}`);
    await expect(page.locator("article.ayah-panel")).toHaveCount(count);
  }
});

test("the gradually brightening tint grows lighter through the ayahs", async ({ page }) => {
  await page.goto("/feel");
  await page.getByRole("button", { name: "Hopeless", exact: true }).click();
  const scene = page.getByTestId("scene");
  await expect(scene).toHaveAttribute("data-tint", "rising");
  const first = Number(await scene.evaluate((el) => getComputedStyle(el).getPropertyValue("--intensity")));
  await page.getByRole("button", { name: "Next ayah" }).click();
  await page.getByRole("button", { name: "Next ayah" }).click();
  await expect(page.getByTestId("feeling-progress")).toHaveText("3 / 3");
  const last = Number(await scene.evaluate((el) => getComputedStyle(el).getPropertyValue("--intensity")));
  expect(first).toBeCloseTo(0.3, 2);
  expect(last).toBe(1);
});

test("I'm not okay shows crisis lines and no ayahs", async ({ page }) => {
  await page.goto("/feel");
  await page.getByRole("button", { name: "I’m not okay" }).click();
  await expect(page.getByText("If you’re thinking about harming yourself or you’re in crisis, please reach out now.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Call 9-8-8/ })).toHaveAttribute("href", "tel:988");
  await expect(page.getByRole("link", { name: /Text 9-8-8/ })).toHaveAttribute("href", "sms:988");
  await expect(page.getByRole("link", { name: /Emergency: 911/ })).toHaveAttribute("href", "tel:911");
  await expect(page.getByRole("link", { name: /Outside Canada/ })).toHaveAttribute("href", "https://findahelpline.com");
  await expect(page.locator("article.ayah-panel")).toHaveCount(0);
  await expect(page.locator("#crisis-heading")).toBeFocused();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "How do you feel?" })).toBeVisible();
});

test("wording stays 'comfort and clarity', never treatment claims", async ({ page }) => {
  await page.goto("/feel");
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const word of ["therapy", "treatment", "cure", "diagnos"]) expect(text).not.toContain(word);
});
