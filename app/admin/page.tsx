import { Suspense } from "react";
import { ACTIVITIES, DAYS, TIMES } from "@/lib/application";
import { APP_STATUSES, filtersToQuery, listApplications, listCohortsAdmin, parseFilters, statusCounts, type ApplicationRow, type Filters } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatMonth, formatTime } from "@/lib/format";
import { secToPace } from "@/lib/pace";
import { signOut, updateApplication } from "./actions";

const TIME_SHORT: Record<string, string> = Object.fromEntries(TIMES.map((t) => [t.value, t.short.replace(/ \(.*\)/, "")]));
const STATUS_LABEL: Record<string, string> = { applied: "New", placed: "Placed", waitlist: "Waitlist", declined: "Declined" };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <section className="admin-section">
      <div className="wrap admin-wrap">
        <Suspense fallback={<p className="panel-sub">Loading applicants…</p>}>
          <Applicants searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Applicants({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const f = parseFilters(await searchParams);
  const [rows, counts, cohorts] = await Promise.all([listApplications(f), statusCounts(), listCohortsAdmin()]);
  const open = cohorts.filter((c) => c.status !== "done");

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">Applicants</h1>
          <p className="admin-sub">
            {counts.total} total · {counts.applied} new · {counts.placed} placed · {counts.waitlist} waitlist · {counts.declined} declined
          </p>
        </div>
        <form action={signOut} className="admin-who">
          <span>{admin}</span>
          <button type="submit" className="btn btn-secondary btn-sm">
            Sign out
          </button>
        </form>
      </div>

      <FilterBar f={f} cohorts={cohorts.map((c) => ({ slug: c.slug, name: c.name }))} />

      <p className="admin-sub" id="result-count">
        Showing {rows.length}
        {rows.length === 500 ? " (first 500)" : ""} ·{" "}
        <a className="link small" href={`/admin/export${filtersToQuery(f)}`}>
          Export CSV
        </a>
      </p>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Applied</th>
              <th>Person</th>
              <th>Goal</th>
              <th>Level</th>
              <th>Can train</th>
              <th>Wants</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No applicants match these filters.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <Row key={r.id} r={r} cohorts={open} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilterBar({ f, cohorts }: { f: Filters; cohorts: { slug: string; name: string }[] }) {
  return (
    <form className="admin-filters" method="get" action="/admin">
      <input className="input" name="q" placeholder="Name, phone or email" defaultValue={f.q} aria-label="Search" />
      <select className="input" name="status" defaultValue={f.status} aria-label="Status">
        <option value="">Any status</option>
        {APP_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <select className="input" name="cohort" defaultValue={f.cohort} aria-label="Cohort">
        <option value="">Any cohort</option>
        <option value="none">No cohort</option>
        {cohorts.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select className="input" name="activity" defaultValue={f.activity} aria-label="Activity">
        <option value="">Any activity</option>
        {ACTIVITIES.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
      <input className="input" name="area" placeholder="Area" defaultValue={f.area} aria-label="Area" />
      <select className="input" name="day" defaultValue={f.day} aria-label="Day">
        <option value="">Any day</option>
        {DAYS.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <select className="input" name="time" defaultValue={f.time} aria-label="Time">
        <option value="">Any time</option>
        {TIMES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.short}
          </option>
        ))}
      </select>
      <div className="pace-range">
        <input className="input" name="paceMin" placeholder="6:00" defaultValue={f.paceMin} aria-label="Fastest easy pace" inputMode="decimal" />
        <span>to</span>
        <input className="input" name="paceMax" placeholder="7:30" defaultValue={f.paceMax} aria-label="Slowest easy pace" inputMode="decimal" />
        <span>/km</span>
      </div>
      <div className="admin-filter-actions">
        <button type="submit" className="btn btn-primary btn-sm">
          Filter
        </button>
        <a className="btn btn-secondary btn-sm" href="/admin">
          Clear
        </a>
      </div>
    </form>
  );
}

function Row({ r, cohorts }: { r: ApplicationRow; cohorts: { id: string; name: string; slug: string }[] }) {
  const wa = `https://wa.me/${r.phone.replace(/\D/g, "")}`;
  const requestedId = cohorts.find((c) => c.slug === r.requested_slug)?.id ?? "";
  return (
    <tr data-id={r.id} data-status={r.status}>
      <td className="nowrap">
        {formatDate(r.created_at)}
        <br />
        <span className="muted">{formatTime(r.created_at)}</span>
        {r.source !== "web" && <span className="chip-tag">{r.source}</span>}
      </td>
      <td>
        <b>{r.name}</b>
        {r.age ? <span className="muted"> · {r.age}</span> : null}
        <br />
        <a className="link small" href={wa} target="_blank" rel="noopener noreferrer">
          {r.phone}
        </a>
        {r.email && (
          <>
            <br />
            <a className="link small" href={`mailto:${r.email}`}>
              {r.email}
            </a>
          </>
        )}
        <br />
        <span className="muted">
          {r.area}, {r.city}
        </span>
      </td>
      <td>
        {r.activity}
        <br />
        <span className="muted">{r.target}</span>
        {r.target_month && (
          <>
            <br />
            <span className="muted">by {formatMonth(r.target_month)}</span>
          </>
        )}
      </td>
      <td>
        {r.level || "—"}
        <br />
        <span className="muted">
          {r.sessions_per_week ? `${r.sessions_per_week}/wk` : ""}
          {r.easy_pace_sec != null ? ` · ${secToPace(r.easy_pace_sec)} /km` : ""}
          {r.weekly_km ? ` · ${Number(r.weekly_km)} km/wk` : ""}
        </span>
        {r.recent_best && (
          <>
            <br />
            <span className="muted">Best: {r.recent_best}</span>
          </>
        )}
      </td>
      <td>
        {r.days.join(", ") || "—"}
        <br />
        <span className="muted">{r.times.map((t) => TIME_SHORT[t] || t).join(", ")}</span>
      </td>
      <td>{r.requested_name || <span className="muted">—</span>}</td>
      <td>
        <span className={`status status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
        {r.cohort_name && (
          <>
            <br />
            <span className="muted">{r.cohort_name}</span>
          </>
        )}
      </td>
      <td className="actions">
        {r.status === "placed" ? (
          <form action={updateApplication}>
            <input type="hidden" name="id" value={r.id} />
            <button className="btn btn-secondary btn-sm" name="op" value="reset">
              Undo
            </button>
          </form>
        ) : (
          <>
            <form action={updateApplication} className="place-form">
              <input type="hidden" name="id" value={r.id} />
              <select className="input input-sm" name="cohort_id" defaultValue={requestedId} aria-label={`Cohort for ${r.name}`} required>
                <option value="" disabled>
                  Pick cohort
                </option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary btn-sm" name="op" value="place">
                Place
              </button>
            </form>
            <form action={updateApplication} className="row-ops">
              <input type="hidden" name="id" value={r.id} />
              {r.status !== "waitlist" && (
                <button className="btn btn-secondary btn-sm" name="op" value="waitlist">
                  Waitlist
                </button>
              )}
              {r.status !== "declined" && (
                <button className="btn btn-secondary btn-sm" name="op" value="decline">
                  Decline
                </button>
              )}
              {r.status !== "applied" && (
                <button className="btn btn-secondary btn-sm" name="op" value="reset">
                  Reset
                </button>
              )}
            </form>
          </>
        )}
      </td>
    </tr>
  );
}
