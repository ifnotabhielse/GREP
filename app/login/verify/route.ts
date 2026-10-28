import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MEMBER_LOGIN_COOKIE } from "@/lib/member";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase";

/** Checks a member's sign-in code (POST from /login), sets the session, then sends them to /me. */
export async function POST(request: Request) {
  // Relative redirects keep the browser on the host it used.
  const go = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });
  const store = await cookies();
  const email = store.get(MEMBER_LOGIN_COOKIE)?.value || "";
  const form = await request.formData();
  const code = String(form.get("code") || "").replace(/\D/g, "");

  if (!email) return go("/login");
  if (!/^\d{6,10}$/.test(code) || !supabaseConfigured()) return go("/login?error=code");

  const { data, error } = await (await supabaseServer()).auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.session) {
    console.error("login/verify:", error?.code, error?.message);
    return go(`/login?error=${error?.code === "otp_expired" ? "expired" : "code"}`);
  }
  store.delete({ name: MEMBER_LOGIN_COOKIE, path: "/login" });
  return go("/me");
}
