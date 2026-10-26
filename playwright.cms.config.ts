import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Credentials stay in memory; this profile never records authentication traces.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (process.env.CMS_ENABLED !== "true") throw new Error("CMS E2E requires CMS_ENABLED=true and an already running CMS server.");
const baseURL = process.env.CMS_E2E_URL || process.env.E2E_URL || "http://localhost:3100";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) throw new Error("CMS E2E only modifies fixtures on a local server.");
process.env.CMS_E2E = "true";

export default defineConfig({
  testDir: "./tests/e2e", testMatch: "cms.spec.ts", outputDir: "test-results/cms",
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
  // Start the prepared production build separately with the same CMS_SERVER_URL.
});
