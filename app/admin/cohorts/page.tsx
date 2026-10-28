import Link from "next/link";
import { Suspense } from "react";
import { STATUS_PILL, startsText } from "@/components/cohort-card";
import { listCohortsAdmin } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { AdminLoadError } from "@/components/admin/load-error";

export default function CohortsAdminPage({ searchParams }: PageProps<"/admin/cohorts">) {
  return (
    <section className="admin-section">
      <div className="wrap admin-wrap">
        <Suspense fallback={<p className="panel-sub">Loading cohorts…</p>}>
          <Cohorts searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Cohorts({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  let cohorts;
  try {
    cohorts = await listCohortsAdmin();
  } catch (err) {
    console.error("admin cohorts page:", err);
    return <AdminLoadError err={err} />;
  }
  const saved = typeof sp.saved === "string" ? sp.saved : "";
  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Cohorts</h1>
          <p className="admin-sub">Published cohorts show on the home page and at their own link. Changes go live within seconds.</p>
        </div>
        <Link className="btn btn-primary btn-sm" href="/admin/cohorts/new">
          New cohort
        </Link>
      </div>
      {saved && (
        <p className="admin-notice ok" role="status">
          Saved. <a className="link small" href={`/c/${saved}`} target="_blank">View /c/{saved} ›</a>
        </p>
      )}
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cohort</th>
              <th>Status</th>
              <th>Starts</th>
              <th>Placed</th>
              <th>Asked for it</th>
              <th>WhatsApp group</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.id} data-slug={c.slug}>
                <td>
                  <b>{c.name}</b>
                  <br />
                  <a className="link small" href={`/c/${c.slug}`} target="_blank">
                    /c/{c.slug}
                  </a>
                </td>
                <td>
                  {STATUS_PILL[c.status].text}
                  <br />
                  <span className="muted">{c.published ? "Published" : "Hidden"}</span>
                </td>
                <td className="nowrap">{startsText(c) || "—"}</td>
                <td>{c.placed}</td>
                <td>{c.requested}</td>
                <td>{c.whatsapp_link ? "Set" : <span className="muted">Not set</span>}</td>
                <td>
                  <Link className="btn btn-secondary btn-sm" href={`/admin/cohorts/${c.id}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
