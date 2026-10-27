import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { supabaseConfigured, supabaseServer } from "./supabase";

export const E2E_ADMIN_COOKIE = "e2e-admin";

/**
 * Test-only sign-in shortcut, used by the Playwright suite because tests can't open magic-link emails.
 * It is OFF unless E2E_AUTH_BYPASS=1, and it refuses to turn on when running on Netlify.
 */
export function e2eBypassEnabled() {
  return process.env.E2E_AUTH_BYPASS === "1" && !process.env.NETLIFY;
}

async function signedInEmail(): Promise<string | null> {
  if (e2eBypassEnabled()) {
    const v = (await cookies()).get(E2E_ADMIN_COOKIE)?.value;
    if (v) return v;
  }
  if (!supabaseConfigured()) return null;
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const rows = await db()<{ ok: number }[]>`select 1 as ok from public.admins where email = ${email.trim().toLowerCase()}::citext`;
  return rows.length > 0;
}

/** The signed-in admin's email, or null. */
export async function getAdmin(): Promise<string | null> {
  const email = await signedInEmail();
  if (!email) return null;
  return (await isAdminEmail(email)) ? email : null;
}

/** For admin pages and actions: the admin's email, or a redirect to the login page. */
export async function requireAdmin(): Promise<string> {
  const email = await getAdmin();
  if (!email) redirect("/admin/login");
  return email;
}
