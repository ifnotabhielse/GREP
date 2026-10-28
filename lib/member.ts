import "server-only";
import { redirect } from "next/navigation";
import { signedInEmail } from "./auth";
import { COHORT_COLUMNS, type Cohort } from "./cohorts";
import { db } from "./db";

/** Remembers which email is signing in, between "email me a code" and "enter the code" (path /login). */
export const MEMBER_LOGIN_COOKIE = "grep-member-email";

/** Members are people who applied. Their login is linked to their applications by email. */
export async function hasApplication(email: string): Promise<boolean> {
  const rows = await db()<{ ok: number }[]>`select 1 as ok from public.applications where email = ${email.trim().toLowerCase()}::citext limit 1`;
  return rows.length > 0;
}

/** For /me pages: the signed-in email, or a redirect to /login. */
export async function requireMember(): Promise<string> {
  const email = await signedInEmail();
  if (!email) redirect("/login");
  return email;
}

export type MemberApplication = {
  id: string;
  created_at: string;
  status: "applied" | "placed" | "waitlist" | "declined";
  activity: string;
  target: string;
  requested_name: string | null;
  cohort_slug: string | null;
  cohort_name: string | null;
};

export async function getMemberApplications(email: string): Promise<MemberApplication[]> {
  return db()<MemberApplication[]>`
    select a.id::text, a.created_at::text, a.status::text, a.activity, a.target,
           rc.name as requested_name, pc.slug as cohort_slug, pc.name as cohort_name
    from public.applications a
    left join public.cohorts rc on rc.id = a.requested_cohort_id
    left join public.cohorts pc on pc.id = a.cohort_id
    where a.email = ${email}::citext
    order by a.created_at desc`;
}

export type MemberCohort = {
  cohort: Cohort;
  whatsappLink: string | null;
  /** First names only, in the order people were placed. `you` marks the signed-in member. */
  members: { firstName: string; you: boolean }[];
};

/** The cohort the member is placed in (most recent placement), with what only members may see. */
export async function getMemberCohort(email: string): Promise<MemberCohort | null> {
  const sql = db();
  const [placed] = await sql<{ cohort_id: string }[]>`
    select cohort_id::text from public.applications
    where email = ${email}::citext and status = 'placed' and cohort_id is not null
    order by updated_at desc limit 1`;
  if (!placed) return null;

  // Not filtered by `published`: a member still sees a cohort the admin has hidden from the public page.
  const [cohort] = await sql.unsafe<Cohort[]>(`select ${COHORT_COLUMNS} from public.cohorts where id = $1`, [placed.cohort_id]);
  if (!cohort) return null;
  const [secret] = await sql<{ whatsapp_link: string | null }[]>`
    select whatsapp_link from public.cohort_secrets where cohort_id = ${placed.cohort_id}::uuid`;
  const people = await sql<{ name: string; email: string | null }[]>`
    select name, email::text from public.applications
    where cohort_id = ${placed.cohort_id}::uuid and status = 'placed'
    order by updated_at, created_at`;

  return {
    cohort: { ...cohort },
    whatsappLink: secret?.whatsapp_link ?? null,
    members: people.map((p) => ({
      firstName: p.name.trim().split(/\s+/)[0] || "Member",
      you: (p.email || "").toLowerCase() === email.toLowerCase(),
    })),
  };
}

/**
 * "Delete my data": removes every application under this email, and the login account.
 * Removing the login uses the database connection's rights on Supabase's auth schema; if that is
 * refused, the applications are still deleted and the person is signed out (logged for follow-up).
 */
export async function deleteMemberData(email: string): Promise<{ applications: number; account: boolean }> {
  const sql = db();
  const res = await sql`delete from public.applications where email = ${email}::citext`;
  let account = false;
  try {
    const r = await sql`delete from auth.users where lower(email) = ${email.toLowerCase()}`;
    account = r.count > 0;
  } catch (err) {
    console.error("deleteMemberData: could not remove the login account", (err as Error).message);
  }
  return { applications: res.count, account };
}
