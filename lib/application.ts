/**
 * The join form's rules, shared by the browser (step-by-step checks) and the server
 * (checks everything again before saving). Messages match the original static form.
 */
import { PACE_MAX_SEC, PACE_MIN_SEC, paceToSec } from "./pace";

export const CONSENT_VERSION = "2026-10-27";

export const CITIES = ["Hyderabad", "Bengaluru", "Mumbai", "Pune", "Delhi NCR", "Chennai", "Other"] as const;
export const AREAS = [
  "Gachibowli", "Financial District", "Nanakramguda", "Kondapur", "Madhapur", "HITEC City", "Kokapet",
  "Manikonda", "Jubilee Hills", "Banjara Hills", "Kukatpally", "Miyapur", "Begumpet", "Secunderabad", "Tolichowki",
];
export const ACTIVITIES = ["Running", "Cycling", "Strength / Gym", "HYROX", "Triathlon", "Swimming", "Tennis / Squash"] as const;
export const TARGET_PLACEHOLDERS: Record<string, string> = {
  Running: "Half marathon under 2:30",
  Cycling: "100 km ride in one day",
  "Strength / Gym": "Bench press 80 kg",
  HYROX: "First HYROX doubles race",
  Triathlon: "Olympic-distance triathlon",
  Swimming: "1.5 km open-water swim",
  "Tennis / Squash": "Play 3 matches a week",
};
export const LEVELS = [
  { value: "Starting out", hint: "New or returning" },
  { value: "Consistent", hint: "Training most weeks" },
  { value: "Competitive", hint: "Racing for times" },
] as const;
/** Shown with en dashes, stored with hyphens. */
export const SESSIONS = [
  { label: "1–2", value: "1-2" },
  { label: "3–4", value: "3-4" },
  { label: "5+", value: "5+" },
] as const;
export const DEVICES = [
  { value: "Apple Watch", label: "Apple Watch" },
  { value: "Garmin", label: "Garmin" },
  { value: "WHOOP", label: "WHOOP" },
  { value: "Strava", label: "Strava" },
  { value: "Fitbit", label: "Fitbit" },
  { value: "Nothing", label: "Nothing yet" },
] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const TIMES = [
  { value: "early_morning", label: "Early morning · 5–7 AM", short: "Early morning (5–7 AM)" },
  { value: "morning", label: "Morning · 7–9 AM", short: "Morning (7–9 AM)" },
  { value: "evening", label: "Evening · 6–8 PM", short: "Evening (6–8 PM)" },
  { value: "late_evening", label: "Late evening · 8–10 PM", short: "Late evening (8–10 PM)" },
] as const;

export const STEP_NAMES = ["About you", "Your goal", "Where you are now", "When you can train"] as const;

/** Everything the form collects, as plain strings and string arrays. */
export type ApplicationInput = {
  name: string;
  age: string;
  email: string;
  city: string;
  cityOther: string;
  area: string;
  phone: string;
  activity: string;
  target: string;
  month: string; // 'YYYY-MM' or ''
  cohort: string; // cohort slug or ''
  level: string;
  sessions: string; // '1-2' | '3-4' | '5+'
  pace: string;
  distance: string;
  best: string;
  devices: string[];
  days: string[];
  times: string[];
  consent: boolean;
};

export const EMPTY_INPUT: ApplicationInput = {
  name: "", age: "", email: "", city: "Hyderabad", cityOther: "", area: "", phone: "",
  activity: "", target: "", month: "", cohort: "",
  level: "", sessions: "", pace: "", distance: "", best: "", devices: [],
  days: [], times: [], consent: false,
};

/** Field key → message. Keys match the form's element ids or chip group names. */
export type FieldErrors = Array<[string, string]>;

export function normPhone(s: string): string {
  let d = String(s).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export const showsPace = (activity: string) => activity === "Running" || activity === "Triathlon";
export const showsDistance = (activity: string) => activity === "Running" || activity === "Cycling" || activity === "Triathlon";

const t = (s: string) => String(s ?? "").trim();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateStep(step: number, v: ApplicationInput): FieldErrors {
  const e: FieldErrors = [];
  if (step === 0) {
    if (t(v.name).length < 2) e.push(["f-name", "Enter your name."]);
    else if (t(v.name).length > 80) e.push(["f-name", "Use 80 characters or fewer."]);
    const age = Number(t(v.age));
    if (!t(v.age) || !Number.isInteger(age) || age < 18 || age > 80) e.push(["f-age", "Enter an age from 18 to 80. Cohorts are for adults."]);
    if (!EMAIL_RE.test(t(v.email)) || t(v.email).length > 254) e.push(["f-email", "Enter your email so we can send your confirmation."]);
    if (!(CITIES as readonly string[]).includes(v.city)) e.push(["f-city", "Pick your city."]);
    if (v.city === "Other" && (t(v.cityOther).length < 2 || t(v.cityOther).length > 60)) e.push(["f-city-other", "Enter your city."]);
    if (t(v.area).length < 2 || t(v.area).length > 80) e.push(["f-area", "Enter your area so we can pick a meeting point near you."]);
    if (!/^[6-9]\d{9}$/.test(normPhone(v.phone))) e.push(["f-phone", "Enter a 10-digit Indian mobile number."]);
  } else if (step === 1) {
    if (!(ACTIVITIES as readonly string[]).includes(v.activity)) e.push(["activity", "Pick the activity you're training for."]);
    if (t(v.target).length < 3) e.push(["f-target", "Describe your next target, like a race or a number."]);
    else if (t(v.target).length > 140) e.push(["f-target", "Keep it under 140 characters."]);
    if (v.month && !/^20\d\d-(0[1-9]|1[0-2])$/.test(v.month)) e.push(["f-month", "Pick a month from the list."]);
  } else if (step === 2) {
    if (!LEVELS.some((l) => l.value === v.level)) e.push(["level", "Pick the level closest to you."]);
    if (!SESSIONS.some((s) => s.value === v.sessions)) e.push(["sessions", "Pick how often you train now."]);
    if (showsPace(v.activity) && t(v.pace)) {
      const s = paceToSec(t(v.pace));
      if (!(s >= PACE_MIN_SEC && s <= PACE_MAX_SEC)) e.push(["f-pace", "Use minutes and seconds per km, like 6:45."]);
    }
    if (showsDistance(v.activity) && t(v.distance)) {
      const d = Number(t(v.distance));
      if (!(d >= 0 && d <= 1000)) e.push(["f-distance", "Enter weekly distance in km, like 20."]);
    }
    if (t(v.best).length > 80) e.push(["f-best", "Keep it under 80 characters."]);
    if (!v.devices.every((d) => DEVICES.some((x) => x.value === d))) e.push(["devices", "Pick from the list."]);
  } else if (step === 3) {
    if (!v.days.length) e.push(["days", "Pick at least one day."]);
    else if (!v.days.every((d) => (DAYS as readonly string[]).includes(d))) e.push(["days", "Pick days from the list."]);
    if (!v.times.length) e.push(["times", "Pick at least one time slot."]);
    else if (!v.times.every((x) => TIMES.some((s) => s.value === x))) e.push(["times", "Pick times from the list."]);
    if (v.consent !== true) e.push(["f-consent", "Tick this box to continue."]);
  }
  return e;
}

/** Index of the first step with an error, and its errors; or null when everything passes. */
export function validateAll(v: ApplicationInput): { step: number; errors: FieldErrors } | null {
  for (let i = 0; i < 4; i++) {
    const errors = validateStep(i, v);
    if (errors.length) return { step: i, errors };
  }
  return null;
}

const ordered = <T extends string>(list: string[], order: readonly T[]) => order.filter((x) => list.includes(x));

/** The row written to `applications`. Call only after validateAll() passes. */
export function toRow(v: ApplicationInput) {
  const pace = showsPace(v.activity) && t(v.pace) ? paceToSec(t(v.pace)) : null;
  const dist = showsDistance(v.activity) && t(v.distance) ? Math.round(Number(t(v.distance)) * 10) / 10 : null;
  return {
    name: t(v.name),
    email: t(v.email).toLowerCase(),
    phone: `+91${normPhone(v.phone)}`,
    age: Number(t(v.age)),
    city: v.city === "Other" ? t(v.cityOther) : v.city,
    area: t(v.area),
    activity: v.activity,
    target: t(v.target),
    target_month: v.month ? `${v.month}-01` : null,
    level: v.level,
    sessions_per_week: v.sessions,
    easy_pace_sec: pace,
    weekly_km: dist,
    recent_best: t(v.best) || null,
    devices: ordered(v.devices, DEVICES.map((d) => d.value)),
    days: ordered(v.days, DAYS),
    times: ordered(v.times, TIMES.map((x) => x.value)),
    consent_version: CONSENT_VERSION,
  };
}

/** Coerce untrusted input (e.g. a Server Action argument) into ApplicationInput shape. */
export function coerceInput(raw: unknown): ApplicationInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string).slice(0, 300) : "");
  const a = (k: string) => (Array.isArray(r[k]) ? (r[k] as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 20) : []);
  return {
    name: s("name"), age: s("age"), email: s("email"), city: s("city"), cityOther: s("cityOther"),
    area: s("area"), phone: s("phone"), activity: s("activity"), target: s("target"), month: s("month"),
    cohort: s("cohort"), level: s("level"), sessions: s("sessions"), pace: s("pace"), distance: s("distance"),
    best: s("best"), devices: a("devices"), days: a("days"), times: a("times"), consent: r.consent === true,
  };
}
