/** Running pace helpers. Stored as whole seconds per km. */

export const PACE_MIN_SEC = 180; // 3:00 /km
export const PACE_MAX_SEC = 720; // 12:00 /km

/** "6:45" or "6.45" → 405. Anything else → NaN. Same rule as the original form. */
export function paceToSec(s: string): number {
  const m = /^(\d{1,2})[:.]([0-5]\d)$/.exec(String(s).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

/** 405 → "6:45" */
export function secToPace(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** The scale used on cohort cards: 5:30 to 9:00 per km. */
export const CARD_SCALE = { min: 330, max: 540 };

/** Left offset and width (in %) of a pace band on the card scale, clamped to the scale. */
export function bandPosition(minSec: number, maxSec: number, scale = CARD_SCALE) {
  const span = scale.max - scale.min;
  const lo = Math.max(scale.min, Math.min(scale.max, minSec));
  const hi = Math.max(lo, Math.min(scale.max, maxSec));
  const round = (n: number) => Math.round(n * 100) / 100;
  return { left: round(((lo - scale.min) / span) * 100), width: round(((hi - lo) / span) * 100) };
}
