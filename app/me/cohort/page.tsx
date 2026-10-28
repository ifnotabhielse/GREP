import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer, Nav } from "@/components/chrome";
import { PaceMini, SessionLines, paceText, raceLine, startsText } from "@/components/cohort-card";
import { getMemberCohort, requireMember } from "@/lib/member";

export const metadata: Metadata = { title: "My cohort · GREP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MyCohortPage() {
  const email = await requireMember();
  const mine = await getMemberCohort(email);
  if (!mine) redirect("/me");
  const { cohort: c, whatsappLink, members } = mine;
  const starts = startsText(c);
  const pace = paceText(c);

  return (
    <>
      <Nav />
      <main id="top">
        <section className="cohort-hero" aria-labelledby="cohort-title">
          <div className="wrap">
            <p className="eyebrow">
              <Link className="link" href="/me">
                ‹ My GREP
              </Link>
            </p>
            <h1 className="section-title" id="cohort-title">
              {c.name}
            </h1>
            <p className="section-lede">{c.kind === "race" ? raceLine(c) : c.subtitle}</p>

            <div className="cohort cohort-detail">
              <h2 className="member-h2">Your group</h2>
              <ul className="member-people" aria-label="People in your cohort">
                {members.map((m, i) => (
                  <li key={i} className={m.you ? "you" : undefined}>
                    <span className="avatar" aria-hidden="true">
                      {m.firstName.slice(0, 1).toUpperCase()}
                    </span>
                    {m.firstName}
                    {m.you ? " (you)" : ""}
                  </li>
                ))}
              </ul>

              {whatsappLink ? (
                <a className="btn btn-primary btn-lg" href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  Join the WhatsApp group
                </a>
              ) : (
                <p className="admin-notice ok">Your WhatsApp group link is on its way. We&apos;ll add it here.</p>
              )}

              <PaceMini c={c} />
              <dl className="facts">
                {c.meeting_point && (
                  <div>
                    <dt>Meet at</dt>
                    <dd>
                      {c.maps_url ? (
                        <a className="link" href={c.maps_url} target="_blank" rel="noopener noreferrer">
                          {c.meeting_point} ›
                        </a>
                      ) : (
                        c.meeting_point
                      )}
                    </dd>
                  </div>
                )}
                {c.area && (
                  <div>
                    <dt>Area</dt>
                    <dd>{c.area}</dd>
                  </div>
                )}
                {c.sessions.length > 0 && (
                  <div>
                    <dt>Sessions</dt>
                    <dd>
                      <SessionLines sessions={c.sessions} />
                    </dd>
                  </div>
                )}
                {starts && (
                  <div>
                    <dt>Starts</dt>
                    <dd>{starts}</dd>
                  </div>
                )}
                {c.weeks ? (
                  <div>
                    <dt>Length</dt>
                    <dd>{c.weeks} weeks</dd>
                  </div>
                ) : null}
                {pace && (
                  <div>
                    <dt>Easy pace</dt>
                    <dd>{pace}</dd>
                  </div>
                )}
                {c.training && (
                  <div>
                    <dt>Training</dt>
                    <dd>{c.training}</dd>
                  </div>
                )}
              </dl>
            </div>
            <p className="fine">Meet only at the agreed meeting point. If anyone makes you uncomfortable, reply to any GREP email and we&apos;ll act on it.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
