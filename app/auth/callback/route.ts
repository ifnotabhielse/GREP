import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/**
 * Where the admin magic link lands. Supports both link styles Supabase can send:
 * `?code=` (PKCE, the default) and `?token_hash=&type=` (custom email template).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nextParam = searchParams.get("next") || "/admin";
  const next = nextParam.startsWith("/admin") ? nextParam : "/admin";
  const supabase = await supabaseServer();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }
  // Relative redirect so the browser stays on the host it used.
  return new NextResponse(null, { status: 303, headers: { Location: ok ? next : "/admin/login?error=link" } });
}
