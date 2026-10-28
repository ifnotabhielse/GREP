"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { E2E_ADMIN_COOKIE } from "@/lib/auth";
import { MEMBER_LOGIN_COOKIE, hasApplication } from "@/lib/member";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/login", maxAge: 60 * 60 };

/**
 * Emails a one-time code to anyone who has applied with this email. The page always shows the same
 * message, so it never reveals who has applied.
 */
export async function requestMemberCode(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase().slice(0, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/login?error=email");
  if (supabaseConfigured() && (await hasApplication(email))) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
      console.error("requestMemberCode:", error.message);
      redirect("/login?error=send");
    }
  }
  (await cookies()).set(MEMBER_LOGIN_COOKIE, email, COOKIE_OPTS);
  redirect("/login?sent=1");
}

export async function changeMemberEmail() {
  (await cookies()).delete({ name: MEMBER_LOGIN_COOKIE, path: "/login" });
  redirect("/login");
}

export async function signOutMember() {
  const store = await cookies();
  store.delete(E2E_ADMIN_COOKIE);
  if (supabaseConfigured() && store.getAll().some((c) => c.name.startsWith("sb-"))) {
    try {
      await (await supabaseServer()).auth.signOut();
    } catch {
      /* already signed out */
    }
  }
  redirect("/");
}
