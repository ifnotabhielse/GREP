import "server-only";
import { cache } from "react";
import { db } from "./db";

export type CohortStatus = "forming" | "waitlist" | "active" | "done";

export type Cohort = {
  id: string;
  slug: string;
  kind: "race" | "goal";
  name: string;
  subtitle: string | null;
  activity: string;
  race_city: string | null;
  race_date: string | null; // 'YYYY-MM-DD'
  race_date_label: string | null;
  distances: string[];
  training: string | null;
  weeks: number | null;
  area: string | null;
  meeting_point: string | null;
  maps_url: string | null;
  sessions: string[];
  starts_on: string | null; // 'YYYY-MM-DD'
  starts_label: string | null;
  status: CohortStatus;
  pace_min_sec: number | null;
  pace_max_sec: number | null;
  pace_note: string | null;
  join_label: string | null;
  join_target: string | null;
  target_month: string | null; // 'YYYY-MM-DD'
  published: boolean;
  sort_order: number;
};

/** Dates come back as plain 'YYYY-MM-DD' strings so they survive caching unchanged. */
export const COHORT_COLUMNS = `
  id::text, slug, kind::text, name, subtitle, activity, race_city, race_date::text, race_date_label,
  distances, training, weeks, area, meeting_point, maps_url, sessions, starts_on::text, starts_label,
  status::text, pace_min_sec, pace_max_sec, pace_note, join_label, join_target, target_month::text,
  published, sort_order`;

/** Published cohorts shown on the home page (finished ones are hidden). Pages using this are ISR-cached. */
export const getPublishedCohorts = cache(async (): Promise<Cohort[]> => {
  const rows = await db().unsafe<Cohort[]>(
    `select ${COHORT_COLUMNS} from public.cohorts
     where published and status <> 'done'
     order by sort_order, created_at`,
  );
  return rows.map((r) => ({ ...r }));
});

/** One published cohort by slug, including finished ones (old links keep working). */
export const getPublishedCohort = cache(async (slug: string): Promise<Cohort | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const rows = await db().unsafe<Cohort[]>(`select ${COHORT_COLUMNS} from public.cohorts where published and slug = $1`, [slug]);
  return rows[0] ? { ...rows[0] } : null;
});

/** What the join form needs to pre-fill when someone picks a cohort. */
export type CohortPreset = { slug: string; label: string; activity: string; target: string; month: string };

export function toPreset(c: Cohort): CohortPreset {
  return {
    slug: c.slug,
    label: c.join_label || c.name,
    activity: c.activity,
    target: c.join_target || c.name,
    month: c.target_month ? c.target_month.slice(0, 7) : "",
  };
}
