import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Credentials stay in memory; this profile never records authentication traces.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (process.env.CMS_ENABLED !== "true") throw new Error("Use node scripts/cms/test-admin.mjs to start the isolated CMS browser test environment.");
if (!/^hk_test_admin_[a-f0-9]{16}$/.test(process.env.CMS_E2E_ISOLATED || "")) throw new Error("Use node scripts/cms/test-admin.mjs: CMS browser tests require a disposable database and server.");
const baseURL = process.env.CMS_E2E_URL || process.env.E2E_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) throw new Error("CMS E2E only modifies fixtures on a local server.");
process.env.CMS_E2E = "true";

export default defineConfig({
  testDir: "./tests/e2e", testMatch: ["cms.spec.ts", "cms-admin.spec.ts"], outputDir: "test-results/cms",
  fullyParallel: false, workers: 1, retries: 0,
  timeout: 90_000, expect: { timeout: 15_000 }, reporter: [["list"]],
  use: {
    baseURL, channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "off", video: "off", screenshot: "off", reducedMotion: "reduce",
    extraHTTPHeaders: { Origin: new URL(baseURL).origin, ...(process.env.CMS_GATEWAY_SECRET ? { "x-heisskraft-gateway": process.env.CMS_GATEWAY_SECRET } : {}) },
  },
  projects: [
    { name: "cms-desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "cms-mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // scripts/cms/test-admin.mjs starts and removes the dedicated production server.
});
