import { defineConfig, devices } from "@playwright/test";

import { PORT, STUB_PORT } from "./e2e/ports";

// Set PW_CHROMIUM_PATH to reuse an already-installed Chromium instead of `bunx playwright install`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const phone = {
  ...devices["Pixel 7"],
  viewport: { width: 390, height: 844 },
  launchOptions: { executablePath },
};

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/warm-up.ts",
  fullyParallel: true,
  // One retry everywhere: against a dev server a page can occasionally be clicked before it has hydrated.
  // A test that needed the retry is reported as "flaky", so it is still visible.
  retries: 1,
  // The dev server compiles each page the first time it is hit, which can take more than the default 5 seconds.
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "light", use: { ...phone, colorScheme: "light" } },
    { name: "dark", use: { ...phone, colorScheme: "dark" } },
  ],
  webServer: [
    {
      command: "bun scripts/dove-stub.ts",
      port: STUB_PORT,
      // Never reuse a running server: it could be one that talks to the real API.
      reuseExistingServer: false,
      env: { STUB_PORT: String(STUB_PORT), APP_ORIGIN: `http://localhost:${PORT}` },
    },
    {
      command: `bunx next dev --port ${PORT}`,
      port: PORT,
      reuseExistingServer: false,
      env: {
        // A separate build folder, so this can run next to your own `bun dev`.
        NEXT_DIST_DIR: ".next-e2e",
        DOVE_API_URL: `http://localhost:${STUB_PORT}/api/v1`,
        APP_URL: `http://localhost:${PORT}`,
      },
    },
  ],
});
