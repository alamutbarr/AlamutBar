import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig(base, {
  testMatch: "**/mobile-workspace.spec.ts",
  testIgnore: [],
  timeout: 90000,
  outputDir: "mobile-test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-mobile-report", open: "never" }],
  ],
  projects: [
    {
      name: "android-viewport",
      use: {
        ...devices["Pixel 7"],
        channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
      },
    },
    { name: "iphone-viewport", use: { ...devices["iPhone 13"] } },
  ],
});
