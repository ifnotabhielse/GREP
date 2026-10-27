import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against a production build (`next build && next start`) and a fresh
 * local Postgres (PGlite) seeded with the same migration and seed files Supabase uses.
 *   npm run e2e
 */
const PORT = 3100;
export const DB_PORT = 54330;
export const DB_URL = `postgres://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`;
export const E2E_SALT = "e2e-salt";
export const E2E_ADMIN = "admin@grep.test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: "npx tsx scripts/local-db.ts",
      port: DB_PORT,
      reuseExistingServer: false,
      env: { LOCAL_DB_PORT: String(DB_PORT), LOCAL_DB_ADMIN: E2E_ADMIN },
      timeout: 60_000,
    },
    {
      command: `npx next build && npx next start -p ${PORT}`,
      port: PORT,
      reuseExistingServer: false,
      timeout: 600_000,
      env: {
        DATABASE_URL: DB_URL,
        E2E_AUTH_BYPASS: "1",
        E2E_OUTBOX: ".e2e/outbox",
        IP_HASH_SALT: E2E_SALT,
        ADMIN_ALERT_EMAIL: "alerts@grep.test",
        NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
        RESEND_API_KEY: "",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
