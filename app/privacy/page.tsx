import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/legal";

export const metadata: Metadata = { title: "Privacy policy · GREP", description: "What GREP collects, why, who sees it and how to delete it." };

// DRAFT for legal review. Written against India's DPDP Act 2023 and DPDP Rules 2025 as understood on 27 Oct 2026.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="Tue, 27 Oct 2026">
      <h2>Who we are</h2>
      <p>
        GREP matches people into small training groups in Hyderabad, India. When this policy says &quot;we&quot;, it means GREP. For any question
        about your data, or to make a complaint, contact <Contact />.
      </p>

      <h2>What we collect</h2>
      <p>When you apply to join a cohort, we collect what you type into the form:</p>
      <ul>
        <li>your name, age, email, WhatsApp number, city and area;</li>
        <li>your activity, target and target date, and the cohort you picked;</li>
        <li>your level, how often you train, your easy pace, weekly distance, recent best and the devices you track with;</li>
        <li>the days and times you can train.</li>
      </ul>
      <p>
        We also keep the date you agreed to this policy. To stop spam, we briefly keep a scrambled (hashed) version of your internet address, which
        we delete within a day. We don&apos;t use advertising trackers.
      </p>

      <h2>Why we collect it</h2>
      <ul>
        <li>To place you in a cohort of people at your pace, near you, at times that work for everyone.</li>
        <li>To contact you on WhatsApp and email about your application and your cohort.</li>
        <li>To run the cohort: meeting points, session plans and attendance.</li>
      </ul>
      <p>We only use your data for these purposes, and only because you agreed to it when you applied.</p>

      <h2>Who sees it</h2>
      <ul>
        <li>
          <strong>The GREP team</strong> sees your application so we can match you.
        </li>
        <li>
          <strong>Your cohort</strong>, once you&apos;re placed in one, sees your first name. If you join the cohort&apos;s WhatsApp group, members
          there see your number, as in any WhatsApp group.
        </li>
        <li>
          <strong>Service providers</strong> who store or send data for us: Supabase (database, hosted in Mumbai), Netlify (website hosting) and
          Resend (email). They process it only to provide their service to us.
        </li>
      </ul>
      <p>We don&apos;t sell your data or share it with advertisers.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your application while you&apos;re waiting for a match or training with a cohort, and for up to 12 months after your last cohort ends,
        so we can match you again. After that, or sooner if you ask, we delete it.
      </p>

      <h2>Your rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>tell you what data we hold about you;</li>
        <li>correct or update it;</li>
        <li>delete it, and withdraw your consent at any time;</li>
        <li>let someone you nominate act on your behalf if you can&apos;t.</li>
      </ul>
      <p>
        Write to <Contact /> from the email you applied with, or reply to your confirmation email. We&apos;ll respond as soon as we can, and within the
        time the law requires. If you&apos;re not happy with our answer, you can complain to the Data Protection Board of India.
      </p>

      <h2>Age</h2>
      <p>GREP is for adults. You must be 18 or older to apply. If we learn that someone under 18 applied, we delete their data.</p>

      <h2>Security</h2>
      <p>
        Your data is stored in an access-controlled database. Only the GREP team can open the admin screen, and each sign-in uses a one-time email
        link.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&apos;ll tell you by email before the change applies.</p>
    </LegalPage>
  );
}
