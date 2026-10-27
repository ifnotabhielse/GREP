"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { coerceInput, toRow, validateAll, type FieldErrors } from "@/lib/application";
import { db } from "@/lib/db";
import { adminAlertEmail, confirmationEmail, sendMail } from "@/lib/email";
import { clientIpHash, siteUrl } from "@/lib/request";

export type SubmitResult =
  | { ok: true; firstName: string; phone: string }
  | { ok: false; step?: number; errors?: FieldErrors; message?: string };

const RATE_LIMIT = { max: 5, windowMinutes: 60 };

/**
 * Save a join-form application. Everything is checked again here; the browser checks are only for speed.
 * Order: honeypot → rate limit → validation → save → emails (sent after the response).
 */
export async function submitApplication(raw: unknown, botField: unknown): Promise<SubmitResult> {
  const input = coerceInput(raw);
  const firstName = input.name.trim().split(/\s+/)[0] || "there";

  // Bots that fill the hidden field get a normal-looking success and nothing is saved.
  if (typeof botField === "string" && botField.trim() !== "") {
    return { ok: true, firstName, phone: "+91 " + input.phone.replace(/\D/g, "").slice(-10) };
  }

  const h = await headers();
  const sql = db();
  const ipHash = clientIpHash(h);

  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from public.submit_attempts
    where ip_hash = ${ipHash} and created_at > now() - make_interval(mins => ${RATE_LIMIT.windowMinutes})`;
  if (n >= RATE_LIMIT.max) {
    return { ok: false, message: "Too many applications from this connection. Try again in an hour." };
  }
  await sql`insert into public.submit_attempts (ip_hash) values (${ipHash})`;
  // Housekeeping: keep the table small.
  after(() => sql`delete from public.submit_attempts where created_at < now() - interval '1 day'`.then(() => undefined));

  const bad = validateAll(input);
  if (bad) return { ok: false, step: bad.step, errors: bad.errors };

  const row = toRow(input);

  let cohort: { id: string; name: string } | undefined;
  if (input.cohort) {
    [cohort] = await sql<{ id: string; name: string }[]>`
      select id::text, name from public.cohorts where slug = ${input.cohort} and published`;
  }

  // If the same number applied in the last 24 hours, update that application instead of adding a duplicate.
  const [recent] = await sql<{ id: string }[]>`
    select id::text from public.applications
    where phone = ${row.phone} and source = 'web' and created_at > now() - interval '24 hours'
    order by created_at desc limit 1`;

  const values = {
    ...row,
    requested_cohort_id: cohort?.id ?? null,
    consent_at: new Date(),
    source: "web",
  };
  const cols = [
    "name", "email", "phone", "age", "city", "area", "activity", "target", "target_month", "level",
    "sessions_per_week", "easy_pace_sec", "weekly_km", "recent_best", "devices", "days", "times",
    "consent_version", "requested_cohort_id", "consent_at", "source",
  ] as const;

  try {
    if (recent) {
      await sql`update public.applications set ${sql(values, cols)} where id = ${recent.id}`;
    } else {
      await sql`insert into public.applications ${sql(values, cols)}`;
    }
  } catch (err) {
    console.error("submitApplication: save failed", err);
    return { ok: false, message: "We couldn't save your application. Try again in a minute." };
  }

  const phoneDisplay = `+91 ${row.phone.slice(3)}`;
  const site = siteUrl(h);
  after(async () => {
    const jobs: Promise<void>[] = [];
    const c = confirmationEmail({ firstName, phone: phoneDisplay, cohortName: cohort?.name, site });
    jobs.push(sendMail({ to: row.email, ...c }));
    const adminTo = process.env.ADMIN_ALERT_EMAIL;
    if (adminTo) {
      const a = adminAlertEmail({
        name: row.name, phone: phoneDisplay, email: row.email, area: row.area, activity: row.activity,
        target: row.target, cohortName: cohort?.name, adminUrl: `${site}/admin`,
      });
      jobs.push(sendMail({ to: adminTo, replyTo: row.email, ...a }));
    }
    const results = await Promise.allSettled(jobs);
    for (const r of results) if (r.status === "rejected") console.error("submitApplication: email failed", r.reason);
  });

  return { ok: true, firstName, phone: phoneDisplay };
}
