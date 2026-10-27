import "server-only";
import { COHORT_COLUMNS, type Cohort } from "./cohorts";
import { db } from "./db";
import { DAYS, TIMES } from "./application";
import { paceToSec } from "./pace";

export const APP_STATUSES = ["applied", "placed", "waitlist", "declined"] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export type Filters = {
  status: string; // '' = all
  activity: string;
  cohort: string; // slug, 'none' = no cohort requested or placed, '' = any
  area: string;
  day: string;
  time: string;
  paceMin: string; // 'm:ss'
  paceMax: string;
  q: string; // name, phone or email
};

export const EMPTY_FILTERS: Filters = { status: "", activity: "", cohort: "", area: "", day: "", time: "", paceMin: "", paceMax: "", q: "" };

type SP = Record<string, string | string[] | undefined>;
export function parseFilters(sp: SP | URLSearchParams): Filters {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return (Array.isArray(v) ? v[0] : v ?? "").toString().slice(0, 80);
  };
  return {
    status: (APP_STATUSES as readonly string[]).includes(get("status")) ? get("status") : "",
    activity: get("activity"),
    cohort: get("cohort"),
    area: get("area"),
    day: (DAYS as readonly string[]).includes(get("day")) ? get("day") : "",
    time: TIMES.some((t) => t.value === get("time")) ? get("time") : "",
    paceMin: Number.isNaN(paceToSec(get("paceMin"))) ? "" : get("paceMin"),
    paceMax: Number.isNaN(paceToSec(get("paceMax"))) ? "" : get("paceMax"),
    q: get("q"),
  };
}

export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export type ApplicationRow = {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string;
  age: number | null;
  city: string;
  area: string;
  activity: string;
  target: string;
  target_month: string | null;
  level: string | null;
  sessions_per_week: string | null;
  easy_pace_sec: number | null;
  weekly_km: string | null;
  recent_best: string | null;
  devices: string[];
  days: string[];
  times: string[];
  status: AppStatus;
  source: string;
  admin_note: string | null;
  requested_slug: string | null;
  requested_name: string | null;
  cohort_id: string | null;
  cohort_slug: string | null;
  cohort_name: string | null;
};

export async function listApplications(f: Filters, limit = 500): Promise<ApplicationRow[]> {
  const sql = db();
  const like = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const conds = [sql`true`];
  if (f.status) conds.push(sql`a.status = ${f.status}::public.application_status`);
  if (f.activity) conds.push(sql`a.activity = ${f.activity}`);
  if (f.cohort === "none") conds.push(sql`a.requested_cohort_id is null and a.cohort_id is null`);
  else if (f.cohort) conds.push(sql`(rc.slug = ${f.cohort} or pc.slug = ${f.cohort})`);
  if (f.area) conds.push(sql`a.area ilike ${like(f.area)}`);
  if (f.day) conds.push(sql`${f.day} = any(a.days)`);
  if (f.time) conds.push(sql`${f.time} = any(a.times)`);
  if (f.paceMin) conds.push(sql`a.easy_pace_sec >= ${paceToSec(f.paceMin)}`);
  if (f.paceMax) conds.push(sql`a.easy_pace_sec <= ${paceToSec(f.paceMax)}`);
  if (f.q) conds.push(sql`(a.name ilike ${like(f.q)} or a.email ilike ${like(f.q)} or a.phone like ${like(f.q.replace(/\D/g, "") || f.q)})`);
  const where = conds.reduce((acc, c) => sql`${acc} and ${c}`);

  return sql<ApplicationRow[]>`
    select a.id::text, a.created_at::text, a.name, a.email::text, a.phone, a.age, a.city, a.area, a.activity, a.target,
           a.target_month::text, a.level, a.sessions_per_week, a.easy_pace_sec, a.weekly_km::text, a.recent_best,
           a.devices, a.days, a.times, a.status::text, a.source, a.admin_note,
           rc.slug as requested_slug, rc.name as requested_name,
           a.cohort_id::text, pc.slug as cohort_slug, pc.name as cohort_name
    from public.applications a
    left join public.cohorts rc on rc.id = a.requested_cohort_id
    left join public.cohorts pc on pc.id = a.cohort_id
    where ${where}
    order by a.created_at desc
    limit ${limit}`;
}

export async function statusCounts() {
  const rows = await db()<{ status: AppStatus; n: number }[]>`
    select status::text, count(*)::int as n from public.applications group by status`;
  const out: Record<AppStatus | "total", number> = { total: 0, applied: 0, placed: 0, waitlist: 0, declined: 0 };
  for (const r of rows) {
    out[r.status] = r.n;
    out.total += r.n;
  }
  return out;
}

export type AdminCohort = Cohort & { whatsapp_link: string | null; placed: number; requested: number };

export async function listCohortsAdmin(): Promise<AdminCohort[]> {
  const cols = COHORT_COLUMNS.split(",").map((c) => `c.${c.trim()}`).join(", ");
  const rows = await db().unsafe<AdminCohort[]>(`
    select ${cols}, s.whatsapp_link,
      (select count(*)::int from public.applications a where a.cohort_id = c.id) as placed,
      (select count(*)::int from public.applications a where a.requested_cohort_id = c.id) as requested
    from public.cohorts c
    left join public.cohort_secrets s on s.cohort_id = c.id
    order by c.sort_order, c.created_at`);
  return rows.map((r) => ({ ...r }));
}

export async function getCohortAdmin(id: string): Promise<AdminCohort | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const all = await listCohortsAdmin();
  return all.find((c) => c.id === id) ?? null;
}

const csvCell = (v: unknown) => {
  if (v == null) return "";
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  // Stop spreadsheet apps from treating a cell as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: ApplicationRow[]): string {
  const cols: [string, (r: ApplicationRow) => unknown][] = [
    ["applied_at", (r) => r.created_at],
    ["status", (r) => r.status],
    ["placed_cohort", (r) => r.cohort_slug],
    ["requested_cohort", (r) => r.requested_slug],
    ["name", (r) => r.name],
    ["age", (r) => r.age],
    ["phone", (r) => r.phone],
    ["email", (r) => r.email],
    ["city", (r) => r.city],
    ["area", (r) => r.area],
    ["activity", (r) => r.activity],
    ["target", (r) => r.target],
    ["target_month", (r) => r.target_month?.slice(0, 7)],
    ["level", (r) => r.level],
    ["sessions_per_week", (r) => r.sessions_per_week],
    ["easy_pace", (r) => (r.easy_pace_sec != null ? `${Math.floor(r.easy_pace_sec / 60)}:${String(r.easy_pace_sec % 60).padStart(2, "0")}` : "")],
    ["weekly_km", (r) => r.weekly_km],
    ["recent_best", (r) => r.recent_best],
    ["devices", (r) => r.devices],
    ["days", (r) => r.days],
    ["times", (r) => r.times],
    ["source", (r) => r.source],
    ["note", (r) => r.admin_note],
  ];
  const lines = [cols.map(([h]) => h).join(","), ...rows.map((r) => cols.map(([, f]) => csvCell(f(r))).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
