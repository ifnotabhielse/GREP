/**
 * Turns a Netlify Forms CSV export of `grep-signup` into `applications` rows.
 * The static form posted human-readable values ("+91 98765 43210", "6:52 /km", "Tue, Sat"),
 * so each is converted back to the stored format. Rows that don't fit are reported, not guessed.
 */
import { DAYS, DEVICES, LEVELS, TIMES, normPhone } from "./application";
import { paceToSec } from "./pace";

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): Record<string, string>[] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function parseMonth(s: string): string | null {
  const m = /^([a-z]+)\s+(\d{4})$/i.exec(s.trim());
  if (m) {
    const i = MONTHS.indexOf(m[1].toLowerCase());
    if (i >= 0) return `${m[2]}-${String(i + 1).padStart(2, "0")}-01`;
  }
  const iso = /^(\d{4})-(\d{2})$/.exec(s.trim());
  return iso ? `${iso[1]}-${iso[2]}-01` : null;
}

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export type ImportRow = {
  name: string;
  email: null;
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
  weekly_km: number | null;
  recent_best: string | null;
  devices: string[];
  days: string[];
  times: string[];
  consent_at: string;
  consent_version: string;
  source: "netlify-forms";
  created_at: string;
  cohort_label: string | null;
};

export function mapNetlifyRow(r: Record<string, string>): { row?: ImportRow; error?: string } {
  const created = r.created_at || r.submitted_at || r.date || "";
  const createdAt = created && !Number.isNaN(Date.parse(created)) ? new Date(created).toISOString() : null;
  if (!createdAt) return { error: "missing or unreadable created_at" };
  if (r.consent && !/^(yes|on|true)$/i.test(r.consent)) return { error: "no consent recorded" };

  const phone = normPhone(r.phone || "");
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: `bad phone "${r.phone}"` };
  const name = (r.name || "").trim();
  if (name.length < 2) return { error: "missing name" };
  const age = r.age ? Number(r.age) : null;
  if (age != null && !(Number.isInteger(age) && age >= 18 && age <= 80)) return { error: `bad age "${r.age}"` };

  const paceRaw = (r.pace || "").replace(/\s*\/\s*km$/i, "").trim();
  const pace = paceRaw ? paceToSec(paceRaw) : null;
  if (paceRaw && !(pace! >= 180 && pace! <= 720)) return { error: `bad pace "${r.pace}"` };
  const kmRaw = (r.distance || "").replace(/km.*$/i, "").trim();
  const km = kmRaw ? Number(kmRaw) : null;

  const sessions = (r.sessions || "").replace(/–/g, "-").trim() || null;
  const level = LEVELS.some((l) => l.value === r.level) ? r.level : null;
  const devices = list(r.devices || "")
    .map((d) => (d === "Nothing yet" ? "Nothing" : d))
    .filter((d) => DEVICES.some((x) => x.value === d));
  const days = DAYS.filter((d) => list(r.days || "").includes(d));
  const times = TIMES.filter((t) => list(r.times || "").includes(t.short)).map((t) => t.value);

  return {
    row: {
      name: name.slice(0, 80),
      email: null,
      phone: `+91${phone}`,
      age,
      city: (r.city || "Hyderabad").slice(0, 60),
      area: (r.area || "").slice(0, 80) || "Unknown",
      activity: r.activity || "Running",
      target: (r.target || "").slice(0, 140) || "Not given",
      target_month: r.month && r.month !== "No date yet" ? parseMonth(r.month) : null,
      level,
      sessions_per_week: sessions && ["1-2", "3-4", "5+"].includes(sessions) ? sessions : null,
      easy_pace_sec: pace,
      weekly_km: km != null && km >= 0 && km <= 1000 ? km : null,
      recent_best: (r.best || "").slice(0, 80) || null,
      devices,
      days,
      times,
      consent_at: createdAt,
      consent_version: "netlify-forms-2026",
      source: "netlify-forms",
      created_at: createdAt,
      cohort_label: r.cohort || null,
    },
  };
}
