import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const STUB_PORT = 4010;

// Set PW_CHROMIUM_PATH to reuse an already-installed Chromium instead of `bunx playwright install`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const phone = {
  ...devices["Pixel 7"],
  viewport: { width: 390, height: 844 },
  launchOptions: { executablePath },
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
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
      reuseExistingServer: !process.env.CI,
      env: { STUB_PORT: String(STUB_PORT), APP_ORIGIN: `http://localhost:${PORT}` },
    },
    {
      command: "bun run dev",
      port: PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        DOVE_API_URL: `http://localhost:${STUB_PORT}/api/v1`,
        APP_URL: `http://localhost:${PORT}`,
      },
    },
  ],
});
