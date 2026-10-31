import { expect, test } from "./fixtures";

async function openNavigator(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Choose another surah" }).click();
  return page.getByPlaceholder("Name, number, or 2:255");
}

test("search forgives spelling: Yaseen, rehman and baqara all find their surah", async ({ page }) => {
  const search = await openNavigator(page);
  for (const [query, name] of [["Yaseen", "Ya-Sin"], ["yasin", "Ya-Sin"], ["rehman", "Ar-Rahman"], ["baqara", "Al-Baqarah"], ["taubah", "At-Tawbah"]]) {
    await search.fill(query);
    await expect(page.getByRole("listitem").first()).toContainText(name);
  }
  await search.fill("zzqxv");
  await expect(page.getByText("No surah found")).toBeVisible();
});

test("typing 2:255 or 'baqarah 255' jumps straight to Ayat al-Kursi", async ({ page }) => {
  let search = await openNavigator(page);
  await search.fill("2:255");
  await page.getByTestId("jump-to-ayah").click();
  await expect(page.locator('[data-verse-key="2:255"] .quran-arabic')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("header")).toContainText("255 / 286");

  await page.getByRole("button", { name: "Choose another surah" }).click();
  search = page.getByPlaceholder("Name, number, or 2:255");
  await search.fill("ya-sin 12");
  await search.press("Enter");
  await expect(page.locator('[data-verse-key="36:12"] .quran-arabic')).toBeVisible({ timeout: 45_000 });
});

test("a plain number offers that ayah of the current surah too", async ({ page }) => {
  const search = await openNavigator(page);
  await search.fill("5");
  await expect(page.getByTestId("jump-to-ayah")).toHaveText("Ayah 5 of Al-Fatihah");
  await page.getByTestId("jump-to-ayah").click();
  await expect(page.locator("header")).toContainText("5 / 7");
});

test("each surah resumes where it was left", async ({ page }) => {
  let search = await openNavigator(page);
  await search.fill("18:10");
  await page.getByTestId("jump-to-ayah").click();
  await expect(page.locator("header")).toContainText("10 / 110", { timeout: 45_000 });

  await page.getByRole("button", { name: "Choose another surah" }).click();
  search = page.getByPlaceholder("Name, number, or 2:255");
  await search.fill("67:3");
  await page.getByTestId("jump-to-ayah").click();
  await expect(page.locator("header")).toContainText("3 / 30", { timeout: 45_000 });

  await page.getByRole("button", { name: "Choose another surah" }).click();
  search = page.getByPlaceholder("Name, number, or 2:255");
  await search.fill("kahf");
  await expect(page.getByRole("listitem").filter({ hasText: "Al-Kahf" })).toContainText("Resume at 10");
  await page.getByRole("listitem").filter({ hasText: "Al-Kahf" }).click();
  await expect(page.locator('[data-verse-key="18:10"] .quran-arabic')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("header")).toContainText("10 / 110");
});

test("a feeling's set can be passed on as one link that names no feeling", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    navigator.share = async (data?: ShareData) => {
      (window as unknown as { __shared: unknown[] }).__shared.push(data);
    };
  });
  await page.goto("/feel");
  await page.getByRole("button", { name: "Stressed", exact: true }).click();
  await expect(page.locator('[data-verse-key="13:28"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Share Ar-Ra'd 13:28" }).click();
  await page.getByRole("button", { name: /Send all 4 ayahs/ }).click();
  const shared = await page.evaluate(() => (window as unknown as { __shared: ShareData[] }).__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].url).toBe("http://127.0.0.1:3000/13/28#set=13-28.94-5.94-6.65-3");
  expect(JSON.stringify(shared[0]).toLowerCase()).not.toContain("stressed");
});

test("opening a shared set shows those ayahs one at a time; the server sees only the first ayah", async ({ page }) => {
  const paths: string[] = [];
  page.on("request", (request) => paths.push(new URL(request.url()).pathname + new URL(request.url()).search));
  await page.goto("/13/28#set=13-28.94-5.94-6.65-3");
  await expect(page.locator('[data-verse-key="13:28"] .quran-arabic')).toBeVisible();
  await expect(page.getByTestId("feeling-progress")).toHaveText("1 / 4");
  await page.getByRole("button", { name: "Next ayah" }).click();
  await expect(page.locator('[data-verse-key="94:5"] .quran-arabic')).toBeVisible();
  await expect(page.getByTestId("feeling-progress")).toHaveText("2 / 4");
  // The set lives in the #fragment, which is never sent. (Surah data files are fetched as for any reading.)
  expect(paths.filter((p) => /set=|94[-:]5|13[-:]28/.test(p))).toEqual([]);
  await page.getByRole("button", { name: "Open the Quran reader" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:3000\/$/);
});

test("a broken set link falls back to the single ayah", async ({ page }) => {
  await page.goto("/13/28#set=13-28.13-99");
  await expect(page.locator('[data-verse-key="13:28"] .quran-arabic')).toBeVisible();
  await expect(page.getByTestId("feeling-progress")).toHaveCount(0);
  await expect(page.locator("header")).toContainText("28 / 43");
});

test("the share sheet offers the ayah as an image card from our own server", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    navigator.share = async (data?: ShareData) => {
      (window as unknown as { __shared: unknown[] }).__shared.push({ files: data?.files?.map((f) => [f.name, f.type, f.size]), text: data?.text });
    };
    navigator.canShare = () => true;
  });
  await page.goto("/2/255");
  await expect(page.locator('[data-verse-key="2:255"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Share Al-Baqarah 2:255" }).click();
  const image = page.getByRole("button", { name: /Send as image/ });
  await expect(image).toBeEnabled({ timeout: 45_000 });
  await image.click();
  const shared = await page.evaluate(() => (window as unknown as { __shared: Array<{ files: [string, string, number][]; text: string }> }).__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].files[0][0]).toBe("scroll-the-quran-2-255.png");
  expect(shared[0].files[0][1]).toBe("image/png");
  expect(shared[0].files[0][2]).toBeGreaterThan(20_000);
  expect(shared[0].text).toContain("http://127.0.0.1:3000/2/255");
});
