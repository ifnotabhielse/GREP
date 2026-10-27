import { NextResponse, type NextRequest } from "next/server";
import { listApplications, parseFilters, toCsv } from "@/lib/admin-data";
import { getAdmin } from "@/lib/auth";
import { todayIST } from "@/lib/format";

/** CSV of the applicants matching the current filters. Admins only. */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", request.url));
  const rows = await listApplications(parseFilters(request.nextUrl.searchParams), 10000);
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="grep-applicants-${todayIST()}.csv"`,
      "cache-control": "no-store",
    },
  });
}
