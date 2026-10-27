import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_EMAIL_COOKIE, isAdminEmail } from "@/lib/auth";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase";

/**
 * Checks the sign-in code from the email (POST from /admin/login).
 * Done in a Route Handler, as Supabase documents for Next.js: the session cookies are set on this
 * response, and the browser then loads /admin as a fresh request that carries them.
 */
export async function POST(request: NextRequest) {
  // Relative redirect: the browser stays on the host it used (request.url can say "localhost" behind proxies).
  const go = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });
  const store = await cookies();
  const email = store.get(LOGIN_EMAIL_COOKIE)?.value || "";
  const form = await request.formData();
  // Pasted codes often carry spaces or line breaks; keep the digits only.
  const code = String(form.get("code") || "").replace(/\D/g, "");

  if (!email) return go("/admin/login");
  if (!/^\d{6,10}$/.test(code) || !supabaseConfigured()) return go("/admin/login?error=code");

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.session) {
    console.error("admin/verify:", error?.code, error?.message);
    return go(`/admin/login?error=${error?.code === "otp_expired" ? "expired" : "code"}`);
  }
  if (!(await isAdminEmail(data.session.user.email || email))) return go("/admin/login?error=notadmin");

  store.delete({ name: LOGIN_EMAIL_COOKIE, path: "/admin" });
  return go("/admin");
}
