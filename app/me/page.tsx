import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Nav } from "@/components/chrome";
import { formatDate } from "@/lib/format";
import { getMemberApplications, requireMember, type MemberApplication } from "@/lib/member";
import { signOutMember } from "../login/actions";
import { deleteMyData } from "./actions";

export const metadata: Metadata = { title: "My GREP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<MemberApplication["status"], { text: string; detail: (a: MemberApplication) => string }> = {
  applied: { text: "We're finding your match", detail: (a) => (a.requested_name ? `You asked for ${a.requested_name}. We'll email you when you're placed.` : "We'll email you when you're placed in a cohort.") },
  placed: { text: "You're in", detail: (a) => `You've been placed in ${a.cohort_name}.` },
  waitlist: { text: "On the waitlist", detail: () => "We'll email you as soon as a cohort at your pace opens." },
  declined: { text: "Not placed this time", detail: () => "We couldn't find a group that fits right now. Apply again any time." },
};

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const email = await requireMember();
  const sp = await searchParams;
  const apps = await getMemberApplications(email);
  const placed = apps.find((a) => a.status === "placed");

  return (
    <>
      <Nav />
      <main id="top">
        <section className="cohort-hero" aria-labelledby="me-title">
          <div className="wrap">
            <p className="eyebrow">Signed in as {email}</p>
            <h1 className="section-title" id="me-title">
              {placed ? "You're in." : "My GREP"}
            </h1>

            {placed && (
              <div className="cohort member-card">
                <div className="cohort-top">
                  <span className="pill">Placed</span>
                </div>
                <h2 className="member-h2">{placed.cohort_name}</h2>
                <p className="cohort-goal">Your group, meeting point, sessions and WhatsApp group.</p>
                <Link className="btn btn-primary btn-lg" href="/me/cohort">
                  Open my cohort
                </Link>
              </div>
            )}

            <h2 className="member-h2 member-section">{apps.length === 1 ? "My application" : "My applications"}</h2>
            {apps.length === 0 ? (
              <p className="section-lede">
                There&apos;s no application under this email. <Link className="link" href="/#join">Join a cohort ›</Link>
              </p>
            ) : (
              <div className="member-apps">
                {apps.map((a) => (
                  <div className="rv-sec" key={a.id} data-status={a.status}>
                    <div className="rv-head">
                      <h4>{STATUS[a.status].text}</h4>
                      <span className="muted small-text">Applied {formatDate(a.created_at)}</span>
                    </div>
                    <dl className="rv-list">
                      <div className="rv-row">
                        <dt>Status</dt>
                        <dd>{STATUS[a.status].detail(a)}</dd>
                      </div>
                      <div className="rv-row">
                        <dt>Goal</dt>
                        <dd>
                          {a.activity} · {a.target}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}

            <div className="member-footer">
              <form action={signOutMember}>
                <button type="submit" className="btn btn-secondary">
                  Sign out
                </button>
              </form>
            </div>

            <details className="member-delete">
              <summary>Delete my data</summary>
              <form action={deleteMyData} className="fields">
                <p className="panel-sub">
                  This permanently deletes your applications and your sign-in, and removes you from any cohort. It can&apos;t be undone.
                </p>
                <label className="consent" htmlFor="confirm-delete">
                  <input type="checkbox" id="confirm-delete" name="confirm" />
                  <span>Yes, delete everything GREP has about {email}.</span>
                </label>
                {sp.error === "confirm" && (
                  <p className="err" role="alert">
                    Tick the box to confirm.
                  </p>
                )}
                <div>
                  <button type="submit" className="btn btn-secondary btn-danger">
                    Delete my data
                  </button>
                </div>
              </form>
            </details>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
