"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { E2E_ADMIN_COOKIE, LOGIN_EMAIL_COOKIE, isAdminEmail, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { paceToSec } from "@/lib/pace";
import { siteUrl } from "@/lib/request";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase";

// ---------- Sign in / out ----------

const LOGIN_COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/admin", maxAge: 60 * 60 };

/**
 * Emails a one-time code (and a link) only to emails on the admin list, but always shows the same
 * message, so the form never reveals who is an admin. The email being signed in is remembered in a
 * short-lived cookie for the code step, not put in the URL.
 */
export async function requestLoginLink(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase().slice(0, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/admin/login?error=email");
  if (supabaseConfigured() && (await isAdminEmail(email))) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl(await headers())}/auth/callback?next=/admin`, shouldCreateUser: true },
    });
    if (error) {
      console.error("requestLoginLink:", error.message);
      redirect("/admin/login?error=send");
    }
  }
  (await cookies()).set(LOGIN_EMAIL_COOKIE, email, LOGIN_COOKIE_OPTS);
  redirect("/admin/login?sent=1");
}

/** Checks the code from the email. Works in any browser, unlike the link. */
export async function verifyLoginCode(formData: FormData) {
  const store = await cookies();
  const email = store.get(LOGIN_EMAIL_COOKIE)?.value || "";
  const code = String(formData.get("code") || "").replace(/\s/g, "");
  if (!email) redirect("/admin/login");
  if (!/^\d{6,10}$/.test(code) || !supabaseConfigured()) redirect("/admin/login?error=code");
  const { error } = await (await supabaseServer()).auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    console.error("verifyLoginCode:", error.message);
    redirect("/admin/login?error=code");
  }
  store.delete({ name: LOGIN_EMAIL_COOKIE, path: "/admin" });
  redirect("/admin");
}

export async function changeLoginEmail() {
  (await cookies()).delete({ name: LOGIN_EMAIL_COOKIE, path: "/admin" });
  redirect("/admin/login");
}

export async function signOut() {
  const store = await cookies();
  store.delete(E2E_ADMIN_COOKIE);
  if (supabaseConfigured() && store.getAll().some((c) => c.name.startsWith("sb-"))) {
    try {
      await (await supabaseServer()).auth.signOut();
    } catch {
      /* already signed out */
    }
  }
  redirect("/admin/login");
}

// ---------- Applications ----------

export async function updateApplication(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const op = String(formData.get("op") || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Bad application id");
  const sql = db();
  if (op === "place") {
    const cohortId = String(formData.get("cohort_id") || "");
    if (!/^[0-9a-f-]{36}$/.test(cohortId)) throw new Error("Pick a cohort first");
    await sql`update public.applications set status = 'placed', cohort_id = ${cohortId}::uuid where id = ${id}::uuid`;
  } else if (op === "waitlist") {
    await sql`update public.applications set status = 'waitlist', cohort_id = null where id = ${id}::uuid`;
  } else if (op === "decline") {
    await sql`update public.applications set status = 'declined', cohort_id = null where id = ${id}::uuid`;
  } else if (op === "reset") {
    await sql`update public.applications set status = 'applied', cohort_id = null where id = ${id}::uuid`;
  } else if (op === "note") {
    const note = String(formData.get("note") || "").slice(0, 1000) || null;
    await sql`update public.applications set admin_note = ${note} where id = ${id}::uuid`;
  } else {
    throw new Error("Unknown action");
  }
  revalidatePath("/admin");
}

// ---------- Cohorts ----------

export type CohortFormState = { error?: string };

const text = (f: FormData, k: string, max = 200) => {
  const v = String(f.get(k) ?? "").trim();
  return v ? v.slice(0, max) : null;
};
const lines = (f: FormData, k: string) =>
  String(f.get(k) ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
const date = (f: FormData, k: string) => {
  const v = text(f, k, 10);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

export async function saveCohort(_prev: CohortFormState, f: FormData): Promise<CohortFormState> {
  await requireAdmin();
  const id = text(f, "id", 36);
  const slug = (text(f, "slug", 80) || "").toLowerCase();
  const name = text(f, "name", 80);
  const kind = text(f, "kind", 10);
  const status = text(f, "status", 10) || "forming";
  const paceMin = text(f, "pace_min", 5);
  const paceMax = text(f, "pace_max", 5);
  const month = text(f, "target_month", 7);
  const weeks = text(f, "weeks", 3);
  const maps = text(f, "maps_url", 500);
  const wa = text(f, "whatsapp_link", 300);

  if (!name || name.length < 2) return { error: "Enter a name." };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { error: "The link name can use lowercase letters, numbers and single hyphens, like tata-mumbai-2027." };
  if (kind !== "race" && kind !== "goal") return { error: "Pick race or goal." };
  if (!["forming", "waitlist", "active", "done"].includes(status)) return { error: "Pick a status." };
  const pmin = paceMin ? paceToSec(paceMin) : null;
  const pmax = paceMax ? paceToSec(paceMax) : null;
  if ((paceMin && !(pmin! >= 180 && pmin! <= 720)) || (paceMax && !(pmax! >= 180 && pmax! <= 720))) return { error: "Pace must be between 3:00 and 12:00 per km, like 6:30." };
  if ((pmin == null) !== (pmax == null)) return { error: "Enter both ends of the pace band, or neither." };
  if (pmin != null && pmax != null && pmax < pmin) return { error: "The slower pace must be the larger number." };
  if (month && !/^20\d\d-(0[1-9]|1[0-2])$/.test(month)) return { error: "Target month should look like 2027-02." };
  if (weeks && !(Number(weeks) >= 1 && Number(weeks) <= 52)) return { error: "Weeks must be 1 to 52." };
  if (maps && !maps.startsWith("https://")) return { error: "The map link must start with https://" };
  if (wa && !/^https:\/\/chat\.whatsapp\.com\//.test(wa)) return { error: "The WhatsApp link must start with https://chat.whatsapp.com/" };

  const row = {
    slug, kind, name, status,
    subtitle: text(f, "subtitle"),
    activity: text(f, "activity", 40) || "Running",
    race_city: text(f, "race_city", 60),
    race_date: date(f, "race_date"),
    race_date_label: text(f, "race_date_label", 80),
    distances: lines(f, "distances"),
    training: text(f, "training"),
    weeks: weeks ? Number(weeks) : null,
    area: text(f, "area"),
    meeting_point: text(f, "meeting_point"),
    maps_url: maps,
    sessions: lines(f, "sessions"),
    starts_on: date(f, "starts_on"),
    starts_label: text(f, "starts_label", 80),
    pace_min_sec: pmin,
    pace_max_sec: pmax,
    pace_note: text(f, "pace_note"),
    join_label: text(f, "join_label", 120),
    join_target: text(f, "join_target", 140),
    target_month: month ? `${month}-01` : null,
    published: f.get("published") === "on",
    sort_order: Number(text(f, "sort_order", 6) || 0) || 0,
  };
  const cols = Object.keys(row) as (keyof typeof row)[];

  const sql = db();
  let savedId: string;
  let oldSlug: string | null = null;
  try {
    if (id) {
      const [prev] = await sql<{ slug: string }[]>`select slug from public.cohorts where id = ${id}::uuid`;
      if (!prev) return { error: "That cohort no longer exists." };
      oldSlug = prev.slug;
      await sql`update public.cohorts set ${sql(row, cols)} where id = ${id}::uuid`;
      savedId = id;
    } else {
      const [ins] = await sql<{ id: string }[]>`insert into public.cohorts ${sql(row, cols)} returning id::text`;
      savedId = ins.id;
    }
    await sql`
      insert into public.cohort_secrets (cohort_id, whatsapp_link) values (${savedId}::uuid, ${wa})
      on conflict (cohort_id) do update set whatsapp_link = excluded.whatsapp_link`;
  } catch (err) {
    const msg = String((err as Error).message || err);
    if (/cohorts_slug_key|duplicate key/.test(msg)) return { error: "Another cohort already uses that link name." };
    console.error("saveCohort:", msg);
    return { error: "Couldn't save. Check the fields and try again." };
  }

  // Refresh the home page and the cohort's page straight away.
  revalidatePath("/");
  revalidatePath(`/c/${slug}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/c/${oldSlug}`);
  revalidatePath("/admin/cohorts");
  redirect(`/admin/cohorts?saved=${encodeURIComponent(slug)}`);
}
