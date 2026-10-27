import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CohortForm } from "@/components/admin/cohort-form";
import { getCohortAdmin } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";

/** /admin/cohorts/new and /admin/cohorts/<id> */
export default function EditCohortPage({ params }: PageProps<"/admin/cohorts/[id]">) {
  return (
    <section className="admin-section">
      <div className="wrap admin-wrap">
        <Suspense fallback={<p className="panel-sub">Loading…</p>}>
          <Editor params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const cohort = id === "new" ? null : await getCohortAdmin(id);
  if (id !== "new" && !cohort) notFound();
  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">{cohort ? `Edit ${cohort.name}` : "New cohort"}</h1>
          <p className="admin-sub">
            <Link className="link small" href="/admin/cohorts">
              ‹ All cohorts
            </Link>
          </p>
        </div>
      </div>
      <CohortForm cohort={cohort} />
    </>
  );
}
