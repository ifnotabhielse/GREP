import { cookies } from "next/headers";
import { Suspense } from "react";
import { LOGIN_EMAIL_COOKIE } from "@/lib/auth";
import { changeLoginEmail, requestLoginLink, verifyLoginCode } from "../actions";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  sent: { text: "If that email is on the admin list, we've emailed you a sign-in code. It expires within the hour.", ok: true },
  email: { text: "Enter a valid email.", ok: false },
  send: { text: "Couldn't send the email just now. Supabase limits how many it sends per hour, so wait a few minutes and try again.", ok: false },
  code: { text: "That code didn't work. Check it, or ask for a new one.", ok: false },
  link: { text: "That link didn't work. Use the code from the email instead, or ask for a new one.", ok: false },
};

async function LoginForms({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pending = (await cookies()).get(LOGIN_EMAIL_COOKIE)?.value || "";
  const key = sp.sent ? "sent" : typeof sp.error === "string" ? sp.error : "";
  const m = MESSAGES[key];
  return (
    <>
      {m && (
        <p className={m.ok ? "admin-notice ok" : "admin-notice bad"} role="status">
          {m.text}
        </p>
      )}
      {pending ? (
        <>
          <form action={verifyLoginCode} className="fields">
            <div className="field">
              <label htmlFor="admin-code">Code sent to {pending}</label>
              <input
                className="input"
                id="admin-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                required
                placeholder="123456"
              />
            </div>
            <div className="panel-actions end">
              <button type="submit" className="btn btn-primary">
                Sign in
              </button>
            </div>
          </form>
          <form action={changeLoginEmail} className="admin-switch">
            <button type="submit" className="link small as-link">
              Use a different email or send a new code
            </button>
          </form>
        </>
      ) : (
        <form action={requestLoginLink} className="fields">
          <div className="field">
            <label htmlFor="admin-email">Email</label>
            <input className="input" id="admin-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </div>
          <div className="panel-actions end">
            <button type="submit" className="btn btn-primary">
              Email me a code
            </button>
          </div>
        </form>
      )}
    </>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <section className="admin-section">
      <div className="wrap admin-wrap">
        <div className="join-card admin-login">
          <h1 className="admin-title">Sign in</h1>
          <p className="panel-sub">We&apos;ll email you a one-time code. Only emails on the admin list get one.</p>
          <Suspense fallback={null}>
            <LoginForms searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
