import { Footer, Nav } from "./chrome";

/** Contact shown on legal pages. Set NEXT_PUBLIC_CONTACT_EMAIL before launch. */
export function contactEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
}

export function Contact() {
  const email = contactEmail();
  return email ? <a href={`mailto:${email}`}>{email}</a> : <strong>the contact email on this page (being set up)</strong>;
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main id="top">
        <section className="cohort-hero" aria-labelledby="legal-title">
          <div className="wrap">
            <p className="eyebrow">GREP</p>
            <h1 className="section-title" id="legal-title">
              {title}
            </h1>
            <p className="updated">
              Last updated {updated}. Written in plain language; it may change as GREP grows.
            </p>
            <div className="prose">{children}</div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
