import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import postgres from "postgres";
import { DB_URL, E2E_ADMIN, E2E_SALT } from "../../playwright.config";

let _sql: postgres.Sql | undefined;
export function sql() {
  if (!_sql) _sql = postgres(DB_URL, { prepare: false, max: 1, ssl: false, onnotice: () => {} });
  return _sql;
}

export const OUTBOX = join(process.cwd(), ".e2e", "outbox");
export function clearOutbox() {
  rmSync(OUTBOX, { recursive: true, force: true });
}
export function outbox(): { to: string; subject: string; text: string }[] {
  try {
    return readdirSync(OUTBOX)
      .sort()
      .map((f) => JSON.parse(readFileSync(join(OUTBOX, f), "utf8")));
  } catch {
    return [];
  }
}

/** A unique client IP per test, so the sign-up rate limit doesn't leak between tests. */
export async function useIp(page: Page, ip: string) {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
}
export function ipHash(ip: string) {
  return createHash("sha256").update(`${E2E_SALT}:${ip}`).digest("hex").slice(0, 32);
}

export async function signInAsAdmin(page: Page, email = E2E_ADMIN) {
  await page.context().addCookies([{ name: "e2e-admin", value: email, url: "http://127.0.0.1:3100" }]);
}

/** Rule 6: nothing scrolls sideways. */
export async function expectNoHorizontalScroll(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bw: document.body.scrollWidth }));
  expect(r.sw, `page is ${r.sw}px wide in a ${r.cw}px viewport`).toBeLessThanOrEqual(r.cw);
  expect(r.bw).toBeLessThanOrEqual(r.cw);
}

export const uniquePhone = (seed: number) => `9${String(800000000 + (seed % 100000000)).padStart(9, "0")}`;
