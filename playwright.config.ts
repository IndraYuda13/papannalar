import { defineConfig } from "@playwright/test";
import { appOrigin, appPort, providerOrigin } from "./tests/harness/ports.mjs";

// PNL_APP_PORT / PNL_PROVIDER_PORT (defaults 3100/54325) let a staging instance
// run its browser suite on its own loopback pair instead of production's.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/browser/setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/qa/M01/m01c/playwright-results.json" }],
  ],
  use: {
    baseURL: appOrigin,
    browserName: "chromium",
    trace: "off", // Auth cookies/callback codes must not enter shared artifacts.
  },
  webServer: [
    {
      command: "node tests/harness/provider.mjs",
      url: `${providerOrigin}/health`,
      reuseExistingServer: process.env["PAPANNALAR_REUSE_LOCAL_DEMO"] === "1",
    },
    {
      command: `pnpm start --port ${appPort}`,
      url: `${appOrigin}/masuk`,
      env: {
        APP_ORIGIN: appOrigin,
        NEXT_PUBLIC_SUPABASE_URL: providerOrigin,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-only-publishable-key",
        PAIRING_SECRET: "test-only-pairing-pepper-never-production-2026",
        PAPANNALAR_LOCAL_ADAPTER: "1",
        SAMPLE_ENABLED: "true",
        SAMPLE_TEACHER_ID: "7b000001-0000-4000-8000-000000000001",
        SAMPLE_TEACHER_EMAIL: "recording@qa.invalid",
        SAMPLE_TEACHER_PASSWORD: "local-recording-test-password-only-2026",
        SAMPLE_ACCESS_CODE: "",
      },
      reuseExistingServer: process.env["PAPANNALAR_REUSE_LOCAL_DEMO"] === "1",
      timeout: 60000,
    },
  ],
});
