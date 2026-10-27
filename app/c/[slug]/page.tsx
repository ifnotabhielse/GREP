import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Nav } from "@/components/chrome";
import { PaceMini, STATUS_PILL, SessionLines, joinText, paceText, raceLine, startsText } from "@/components/cohort-card";
import { CohortJoinButton } from "@/components/cohort-join-button";
import { ShareButton } from "@/components/share-button";
import { getPublishedCohort, getPublishedCohorts, toPreset, type Cohort } from "@/lib/cohorts";

export async function generateStaticParams() {
  const cohorts = await getPublishedCohorts();
  // Cache Components needs at least one param; a placeholder simply 404s.
  return cohorts.length ? cohorts.map((c) => ({ slug: c.slug })) : [{ slug: "none" }];
}

function summary(c: Cohort) {
  const what = c.kind === "race" ? `Train for ${c.name}${c.race_date || c.race_date_label ? ` (${raceLine(c)})` : ""}` : `${c.name}: ${c.subtitle ?? ""}`;
  const where = [c.area, c.sessions[0]].filter(Boolean).join(" · ");
  const starts = startsText(c);
  return `${what} with 3 to 6 people at your pace in Hyderabad.${where ? ` ${where}.` : ""}${starts ? ` Starts ${starts}.` : ""}`;
}

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getPublishedCohort(slug);
  if (!c) return { title: "Cohort not found · GREP" };
  const title = `${c.name} cohort · GREP`;
  const description = summary(c);
  return {
    title,
    description,
    alternates: { canonical: `/c/${c.slug}` },
    openGraph: { type: "website", siteName: "GREP", title, description, url: `/c/${c.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CohortPage({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const c = await getPublishedCohort(slug);
  if (!c) notFound();

  const pill = STATUS_PILL[c.status];
  const isRace = c.kind === "race";
  const pace = paceText(c);
  const starts = startsText(c);

  return (
    <>
      <Nav />
      <main id="top">
        <section className="cohort-hero" aria-labelledby="cohort-title">
          <div className="wrap">
            <p className="eyebrow">{isRace ? "Race cohort" : "Goal cohort"} · Hyderabad</p>
            <h1 className="section-title" id="cohort-title">
              {c.name}
            </h1>
            <p className="section-lede">{isRace ? raceLine(c) : c.subtitle}</p>

            <div className="cohort cohort-detail">
              <div className="cohort-top">
                <span className={pill.wait ? "pill wait" : "pill"}>{pill.text}</span>
                {c.weeks ? <span>{c.weeks} weeks</span> : null}
              </div>
              {isRace && c.distances.length > 0 && (
                <div className="dist" aria-label={c.distances.length > 1 ? "Distances" : "Distance"}>
                  {c.distances.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              )}
              <PaceMini c={c} />
              <dl className="facts">
                {c.training && (
                  <div>
                    <dt>Training</dt>
                    <dd>{c.training}</dd>
                  </div>
                )}
                {pace && (
                  <div>
                    <dt>Easy pace</dt>
                    <dd>{pace}</dd>
                  </div>
                )}
                {c.area && (
                  <div>
                    <dt>Area</dt>
                    <dd>{c.area}</dd>
                  </div>
                )}
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
                <div>
                  <dt>Group</dt>
                  <dd>3 to 6 people at your pace</dd>
                </div>
              </dl>
              <div className="cohort-actions">
                <CohortJoinButton preset={toPreset(c)} className="btn btn-primary btn-lg" external>
                  {joinText(c)}
                </CohortJoinButton>
                <ShareButton title={`${c.name} cohort on GREP`} text={`Train for ${c.name} with people at your pace. Join me on GREP.`} />
              </div>
            </div>

            <p className="cohort-note">
              Not your pace or schedule? <Link className="link" href="/#cohorts">See all cohorts ›</Link>
            </p>
            {isRace && (
              <p className="fine">
                GREP isn&apos;t affiliated with this race. Book your race entry directly with the organiser. Race dates come from public announcements and
                can change.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
