import type { Config } from "@netlify/functions";
import postgres from "postgres";

/**
 * Daily job (published site only):
 *  1. One Supabase REST call, so the free project isn't paused for inactivity
 *     (Supabase's docs say API calls count; they don't say whether direct DB connections do).
 *  2. Delete rate-limit records older than a day.
 */
export default async function keepalive() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const res = await fetch(`${url}/rest/v1/cohorts?select=slug&limit=1`, { headers: { apikey: key } });
    console.log(`keepalive: Supabase REST ${res.status}`);
  }
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: "require" });
    const r = await sql`delete from public.submit_attempts where created_at < now() - interval '1 day'`;
    console.log(`keepalive: removed ${r.count} old rate-limit rows`);
    await sql.end();
  }
}

export const config: Config = { schedule: "@daily" };
