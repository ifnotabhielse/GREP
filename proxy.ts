import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the admin's Supabase login fresh (Supabase rotates its tokens, and Server Components
 * can't write cookies). Runs only on /admin pages and only when a Supabase cookie is present.
 * Access control itself happens on the server for every admin page and action (lib/auth.ts).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  try {
    await supabase.auth.getUser();
  } catch {
    // Network trouble: let the page's own check decide.
  }
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
