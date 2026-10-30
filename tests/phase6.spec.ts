import { expect, test } from "./fixtures";

test("share uses the native sheet with only the verse key in the link", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    navigator.share = async (data?: ShareData) => {
      (window as unknown as { __shared: unknown[] }).__shared.push(data);
    };
  });
  await page.goto("/");
  await expect(page.locator('[data-verse-key="1:1"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Next ayah" }).click();
  await expect(page.locator("header")).toContainText("2 / 7");
  await page.getByRole("button", { name: "Share Al-Fatihah 1:2" }).click();
  const shared = await page.evaluate(() => (window as unknown as { __shared: ShareData[] }).__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].url).toBe("http://127.0.0.1:3000/1/2");
  expect(shared[0].title).toBe("Surah Al-Fatihah 1:2");
  expect(shared[0].text).toContain("Allāh");
});

test("without a share sheet, the link is copied with a 'Link copied' notice", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await page.goto("/13/28");
  await expect(page.locator('[data-verse-key="13:28"] .quran-arabic')).toBeVisible();
  await page.getByRole("button", { name: "Share Ar-Ra'd 13:28" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("http://127.0.0.1:3000/13/28");
});

test("shared links carry link-preview tags for WhatsApp and others", async ({ request }) => {
  const response = await request.get("/13/28", { headers: { "User-Agent": "WhatsApp/2.23.20" } });
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("<title>Surah Ar-Ra&#39;d 13:28 · Scroll The Quran</title>");
  expect(html).toContain('<meta property="og:title" content="Surah Ar-Ra&#39;d 13:28" />');
  expect(html).toContain('<meta property="og:url" content="http://127.0.0.1:3000/13/28" />');
  expect(html).toContain('<meta property="og:image" content="http://127.0.0.1:3000/og/13-28.png" />');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  const description = /og:description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  expect(description.length).toBeGreaterThan(40);
  expect(description.length).toBeLessThanOrEqual(170);

  const surah = await (await request.get("/13")).text();
  expect(surah).toContain('<meta property="og:title" content="Surah Ar-Ra&#39;d" />');
  const home = await (await request.get("/")).text();
  expect(home).not.toContain("og:title");
});

test("preview images are 1200x630 PNGs under 300 KB, and invalid ones 404", async ({ request }) => {
  for (const key of ["13-28", "2-255"]) {
    const response = await request.get(`/og/${key}.png`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const body = await response.body();
    expect(body.length).toBeLessThan(300_000);
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  }
  expect((await request.get("/og/13-44.png")).status()).toBe(404);
  expect((await request.get("/og/abc.png")).status()).toBe(404);
});

test("sitemap lists every surah and ayah, and robots points to it", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect((xml.match(/<loc>/g) ?? []).length).toBe(1 + 114 + 6236);
  expect(xml).toContain("<loc>http://127.0.0.1:3000/114/6</loc>");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: http://127.0.0.1:3000/sitemap.xml");
});

test("privacy headers are on every kind of response, including shared links", async ({ request }) => {
  for (const path of ["/", "/13/28", "/privacy", "/feel", "/sitemap.xml", "/og/1-1.png", "/data/chapters.json", "/api/nope", "/does-not-exist"]) {
    const response = await request.get(path, { headers: { Accept: "text/html" } });
    const headers = response.headers();
    expect(headers["content-security-policy"], path).toContain("default-src 'self'");
    expect(headers["referrer-policy"], path).toBe("no-referrer");
    expect(headers["permissions-policy"], path).toBe("microphone=(), camera=(), geolocation=()");
    expect(headers["set-cookie"], path).toBeUndefined();
  }
});
