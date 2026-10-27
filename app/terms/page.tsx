import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal";

export const metadata: Metadata = { title: "Terms · GREP", description: "The terms for joining a GREP training cohort." };

// DRAFT for legal review, especially the exercise and safety sections.
export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="Tue, 27 Oct 2026">
      <h2>What GREP is</h2>
      <p>
        GREP puts people who train at a similar pace, toward a similar goal, into small groups that meet in person. We suggest a meeting point, a
        schedule and a shared weekly plan. We are not a coach, a gym, a medical service or a race organiser.
      </p>

      <h2>Who can join</h2>
      <p>You must be 18 or older and give us accurate details. One application per person.</p>

      <h2>Your health is your responsibility</h2>
      <ul>
        <li>Exercise carries risk of injury and, rarely, serious harm. Train within your limits.</li>
        <li>If you have a medical condition, are pregnant, or haven&apos;t exercised in a while, check with a doctor before you start.</li>
        <li>Stop if you feel unwell, and tell your group.</li>
      </ul>
      <p>You take part in sessions at your own risk.</p>

      <h2>Meeting people safely</h2>
      <ul>
        <li>Cohorts meet in public places. Meet only at the agreed meeting point and time.</li>
        <li>Treat everyone with respect. Harassment, discrimination or unsafe behaviour gets you removed from GREP.</li>
        <li>
          If someone makes you uncomfortable, tell us at <Contact />. We take every report seriously and can move or remove people.
        </li>
      </ul>

      <h2>Races</h2>
      <p>
        GREP isn&apos;t affiliated with any race we mention. Race entries, dates and rules are set by each organiser. Book your entry directly with
        them.
      </p>

      <h2>Placement</h2>
      <p>
        We try to find you a good match, but we can&apos;t promise a place in any cohort, a particular group, or a start date. We may close, merge or
        reschedule cohorts.
      </p>

      <h2>Cost</h2>
      <p>GREP is free while we launch. If we ever charge for something, we&apos;ll tell you the price before you sign up for it.</p>

      <h2>Your data</h2>
      <p>
        How we handle your details is set out in our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, GREP isn&apos;t responsible for injury, loss or damage that happens during training or when meeting other
        members, or for what other members say or do. Nothing here limits rights you have under Indian consumer law.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of India. Courts in Hyderabad, Telangana have jurisdiction.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <Contact />.
      </p>
    </LegalPage>
  );
}
