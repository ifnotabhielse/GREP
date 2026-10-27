/** Display formats for GREP. Everything is shown in IST (Asia/Kolkata). */

const TZ = "Asia/Kolkata";

function parts(d: Date, opts: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** A calendar date stored as 'YYYY-MM-DD' (Postgres `date`). Treated as an IST day. */
function fromDateOnly(s: string): Date {
  // Noon IST avoids any off-by-one around midnight.
  return new Date(`${s.slice(0, 10)}T12:00:00+05:30`);
}

function toDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? fromDateOnly(v) : new Date(v);
}

/** "Sun, 17 Jan 2027" */
export function formatDate(v: string | Date): string {
  const p = parts(toDate(v), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "February 2027" — for target months stored as the 1st of the month. */
export function formatMonth(v: string | Date): string {
  const p = parts(toDate(v), { month: "long", year: "numeric" });
  return `${p.month} ${p.year}`;
}

/** "6:00 AM" */
export function formatTime(v: string | Date): string {
  const p = parts(toDate(v), { hour: "numeric", minute: "2-digit", hour12: true });
  return `${Number(p.hour)}:${p.minute} ${String(p.dayPeriod).toUpperCase()}`;
}

/** "Sun, 17 Jan 2027, 6:00 AM" */
export function formatDateTime(v: string | Date): string {
  return `${formatDate(v)}, ${formatTime(v)}`;
}

/** Keep "6:00 AM" on one line, as the static page did with &nbsp;. */
export function nbspTimes(s: string): string {
  return s.replace(/(\d) (AM|PM)\b/g, "$1 $2");
}

/** Today's date in IST as 'YYYY-MM-DD'. */
export function todayIST(now = new Date()): string {
  const p = parts(now, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

/** The current month plus the next `count - 1`, as { value: 'YYYY-MM', label: 'February 2027' }. */
export function upcomingMonths(count = 15, now = new Date()) {
  const [y, m] = todayIST(now).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { value, label: formatMonth(`${value}-01`) };
  });
}
