import { defineConfig } from "@playwright/test";
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3001";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname))
  throw new Error(
    "E2E tests create fictional records and may only run on loopback.",
  );
export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/mobile-workspace.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL },
  reporter: [["list"], ["html", { open: "never" }]],
});
