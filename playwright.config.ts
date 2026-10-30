import { defineConfig } from "@playwright/test";

// PW_CHROMIUM_PATH lets CI or a dev machine reuse an installed Chromium.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 30_000 },
  reporter: "list",
  projects: [
    { name: "mobile", use: { viewport: { width: 375, height: 812 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      COUNTS_FILE: "test-results/daily-counts.json",
      SUPPORT_URL: "https://example.org/support",
      PUBLIC_ORIGIN: "http://127.0.0.1:3000",
    },
  },
});
