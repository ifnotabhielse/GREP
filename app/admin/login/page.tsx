import { Suspense } from "react";
import { requestLoginLink } from "../actions";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  sent: { text: "If that email is on the admin list, a sign-in link is on its way. It works once and expires within the hour.", ok: true },
  email: { text: "Enter a valid email.", ok: false },
  send: { text: "Couldn't send the link just now. Try again in a minute.", ok: false },
  link: { text: "That link didn't work. It may have expired or been used already. Ask for a new one.", ok: false },
};

async function Notice({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const key = sp.sent ? "sent" : typeof sp.error === "string" ? sp.error : "";
  const m = MESSAGES[key];
  if (!m) return null;
  return (
    <p className={m.ok ? "admin-notice ok" : "admin-notice bad"} role="status">
      {m.text}
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <section className="admin-section">
      <div className="wrap admin-wrap">
        <div className="join-card admin-login">
          <h1 className="admin-title">Sign in</h1>
          <p className="panel-sub">We&apos;ll email you a one-time sign-in link. Only emails on the admin list get one.</p>
          <Suspense fallback={null}>
            <Notice searchParams={searchParams} />
          </Suspense>
          <form action={requestLoginLink} className="fields">
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input className="input" id="admin-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
            </div>
            <div className="panel-actions end">
              <button type="submit" className="btn btn-primary">
                Email me a link
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
