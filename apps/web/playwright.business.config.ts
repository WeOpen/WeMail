import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-business",
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: "test-results/business",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/business", open: "never" }]],
  use: {
    baseURL: process.env.BUSINESS_WEB_URL ?? "http://127.0.0.1:4187",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  }
});
