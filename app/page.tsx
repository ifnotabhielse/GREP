import { Footer, Nav } from "@/components/chrome";
import { CohortGroups } from "@/components/cohort-card";
import { JoinForm } from "@/components/join-form";
import { Bento, Faq, Hero, HowItWorks, Statement } from "@/components/landing";
import { getPublishedCohorts, toPreset } from "@/lib/cohorts";

export default async function Home() {
  const cohorts = await getPublishedCohorts();
  return (
    <>
      <Nav home />
      <main id="top">
        <Hero />
        <Statement />
        <HowItWorks />
        <Bento />

        <section className="cohorts" id="cohorts" aria-labelledby="cohorts-title">
          <div className="wrap">
            <p className="eyebrow">Cohorts · Hyderabad</p>
            <h2 className="section-title" id="cohorts-title">
              Pick your start line.
            </h2>
            <p className="section-lede">
              Train in Hyderabad for India&apos;s big races, or toward a goal of your own. Cycling, HYROX and strength cohorts open as soon as enough
              people sign up.
            </p>
            <CohortGroups cohorts={cohorts} />
            <p className="cohort-note">Don&apos;t see your goal? Sign up anyway. We open a new cohort when enough people at your pace join.</p>
            <p className="fine">
              GREP isn&apos;t affiliated with these races. Book your race entry directly with each organiser. Race dates come from public announcements
              and can change.
            </p>
          </div>
        </section>

        <section id="join" aria-labelledby="join-title">
          <div className="wrap">
            <div className="center">
              <p className="eyebrow">Join</p>
              <h2 className="section-title" id="join-title">
                Join a cohort.
              </h2>
              <p className="section-lede">It takes about two minutes. We message you on WhatsApp once we have your match.</p>
            </div>
            <JoinForm presets={cohorts.map(toPreset)} />
          </div>
        </section>

        <Faq />
      </main>
      <Footer home />
    </>
  );
}
