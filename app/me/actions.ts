"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { E2E_ADMIN_COOKIE } from "@/lib/auth";
import { deleteMemberData, requireMember } from "@/lib/member";
import { supabaseConfigured, supabaseServer } from "@/lib/supabase";

/** Deletes the signed-in person's applications and login, then signs them out. */
export async function deleteMyData(formData: FormData) {
  const email = await requireMember();
  if (formData.get("confirm") !== "on") redirect("/me?error=confirm");
  const result = await deleteMemberData(email);
  console.info(`deleteMyData: removed ${result.applications} application(s); login removed: ${result.account}`);

  const store = await cookies();
  store.delete(E2E_ADMIN_COOKIE);
  if (supabaseConfigured() && store.getAll().some((c) => c.name.startsWith("sb-"))) {
    try {
      await (await supabaseServer()).auth.signOut();
    } catch {
      /* the account may already be gone */
    }
  }
  redirect("/login?deleted=1");
}
