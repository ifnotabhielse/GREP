import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Nav } from "@/components/chrome";

export const metadata: Metadata = { title: "Cohort not found · GREP", robots: { index: false, follow: false } };

export default function CohortNotFound() {
  return (
    <>
      <Nav />
      <main id="top">
        <section className="cohort-hero" aria-labelledby="cohort-title">
          <div className="wrap">
            <p className="eyebrow">Cohorts · Hyderabad</p>
            <h1 className="section-title" id="cohort-title">
              Cohort not found.
            </h1>
            <p className="section-lede">This cohort has finished, moved, or the link has a typo.</p>
            <p className="cohort-note">
              <Link className="link" href="/#cohorts">
                See all cohorts ›
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
