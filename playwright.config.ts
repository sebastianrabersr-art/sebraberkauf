import { defineConfig, devices } from "@playwright/test";

// Standard: Live-Seite. Für lokale Läufe z. B. E2E_BASE_URL=http://localhost:5173
const baseURL = process.env.E2E_BASE_URL ?? "https://kaufma.eu";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "de-AT",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
