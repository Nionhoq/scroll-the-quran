import { expect, test } from "./fixtures";

async function openReader(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
}

test("every app and API response carries strict privacy headers", async ({ page }) => {
  for (const path of ["/", "/api/not-a-route"]) {
    const response = await page.request.get(path);
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("img-src 'self' data:");
    expect(headers["content-security-policy"]).toContain("media-src 'self'");
    expect(headers["content-security-policy"]).toContain("font-src 'self'");
    expect(headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["permissions-policy"]).toBe("microphone=(), camera=(), geolocation=()");
    expect(headers["set-cookie"]).toBeUndefined();
  }
});

test("self-hosted fonts render the reader without external resources", async ({ page }) => {
  await openReader(page);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Hanken Grotesk"'))).toBe(true);
  expect(await page.evaluate(() => document.fonts.check('32px "UthmanicHafs"'))).toBe(true);
  await expect(page.locator("body")).toHaveCSS("font-family", /Hanken Grotesk/);
});

test("audio uses the same-origin proxy with byte ranges and long caching", async ({ page }) => {
  const response = await page.request.get("/audio/7/001001.mp3", {
    headers: { Range: "bytes=0-1023" },
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-range"]).toMatch(/^bytes 0-1023\//);
  expect(response.headers()["cache-control"]).toContain("max-age=31536000");
  expect(response.headers()["content-type"]).toContain("audio/mpeg");
  expect((await response.body()).byteLength).toBe(1024);

  await openReader(page);
  await expect(page.locator("audio")).toHaveAttribute("src", "/audio/7/001001.mp3");
});

test("daily ping sends exactly one bucket once per local calendar day", async ({ page }) => {
  const pings: Array<{ body: unknown; url: string }> = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/ping")) {
      pings.push({ body: request.postDataJSON(), url: request.url() });
    }
  });

  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/ping"));
  await openReader(page);
  expect((await responsePromise).status()).toBe(204);
  expect(pings).toHaveLength(1);
  expect(pings[0].body).toEqual({ bucket: "new" });
  expect(new URL(pings[0].url).search).toBe("");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("scroll-quran:last-ping"))).not.toBeNull();

  await page.reload();
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(pings).toHaveLength(1);
});

test("daily ping rejects extra fields and unknown buckets", async ({ page }) => {
  const extra = await page.request.post("/api/ping", {
    data: { bucket: "new", day: "2026-10-30" },
  });
  expect(extra.status()).toBe(400);

  const invalid = await page.request.post("/api/ping", {
    data: { bucket: "sometimes" },
  });
  expect(invalid.status()).toBe(400);
});

test("privacy screen is linked from settings and explains local-only reading", async ({ page }) => {
  await openReader(page);
  await page.getByRole("button", { name: "Reading settings" }).click();
  await page.getByRole("link", { name: "Privacy, in plain words" }).click();

  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Your reading stays yours." })).toBeVisible();
  await expect(page.getByText("No accounts. No advertising. No tracking across apps or websites. We do not set cookies.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "One anonymous daily count" })).toBeVisible();
  await page.getByRole("link", { name: "Back to reading" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('article[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
});
