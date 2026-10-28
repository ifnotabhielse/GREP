import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Footer, Nav } from "@/components/chrome";
import { signedInEmail } from "@/lib/auth";
import { MEMBER_LOGIN_COOKIE } from "@/lib/member";
import { changeMemberEmail, requestMemberCode } from "./actions";

export const metadata: Metadata = { title: "Sign in · GREP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { text: string; ok: boolean }> = {
  sent: { text: "If you've applied with that email, we've sent you a sign-in code. It expires within the hour.", ok: true },
  email: { text: "Enter a valid email.", ok: false },
  send: { text: "Couldn't send the email just now. Wait a few minutes and try again.", ok: false },
  code: { text: "That code didn't work. Check it, or ask for a new one.", ok: false },
  expired: { text: "That code has expired or was replaced by a newer one. Only the code in your latest email works.", ok: false },
  deleted: { text: "Your details have been deleted.", ok: true },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await signedInEmail()) redirect("/me");
  const sp = await searchParams;
  const pending = (await cookies()).get(MEMBER_LOGIN_COOKIE)?.value || "";
  const key = sp.sent ? "sent" : sp.deleted ? "deleted" : typeof sp.error === "string" ? sp.error : "";
  const m = MESSAGES[key];

  return (
    <>
      <Nav />
      <main id="top">
        <section className="cohort-hero" aria-labelledby="login-title">
          <div className="wrap">
            <div className="join-card member-card">
              <h1 className="admin-title" id="login-title">
                Sign in
              </h1>
              <p className="panel-sub">See your application and, once you&apos;re placed, your cohort. Use the email you applied with.</p>
              {m && (
                <p className={m.ok ? "admin-notice ok" : "admin-notice bad"} role="status">
                  {m.text}
                </p>
              )}
              {pending ? (
                <>
                  <form method="post" action="/login/verify" className="fields">
                    <div className="field">
                      <label htmlFor="member-code">Code sent to {pending}</label>
                      <input className="input" id="member-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={20} required placeholder="12345678" />
                    </div>
                    <div className="panel-actions end">
                      <button type="submit" className="btn btn-primary">
                        Sign in
                      </button>
                    </div>
                  </form>
                  <form action={changeMemberEmail} className="admin-switch">
                    <button type="submit" className="link small as-link">
                      Use a different email or send a new code
                    </button>
                  </form>
                </>
              ) : (
                <form action={requestMemberCode} className="fields">
                  <div className="field">
                    <label htmlFor="member-email">Email</label>
                    <input className="input" id="member-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
                  </div>
                  <div className="panel-actions end">
                    <button type="submit" className="btn btn-primary">
                      Email me a code
                    </button>
                  </div>
                </form>
              )}
              <p className="hint member-hint">
                Haven&apos;t applied yet? <Link className="link small" href="/#join">Join a cohort ›</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
