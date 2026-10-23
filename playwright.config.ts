import { defineConfig } from "@playwright/test";
const exporting = process.env.E2E_EXPORT === "true";
export default defineConfig({
  testDir: "./tests/e2e", outputDir: "test-results/e2e", fullyParallel: false, workers: 1,
  timeout: 60_000, expect: { timeout: 15_000 }, retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: process.env.E2E_URL ?? "http://127.0.0.1:3100", channel: process.env.PLAYWRIGHT_CHANNEL || undefined, launchOptions: { args: ["--enable-unsafe-swiftshader"] }, trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.E2E_URL ? undefined : {
    command: exporting ? "node scripts/serve-export.mjs" : "npm run start:production",
    url: `http://127.0.0.1:3100${exporting ? "/hk-future/" : "/"}`, reuseExistingServer: false, timeout: 60_000,
  },
});
