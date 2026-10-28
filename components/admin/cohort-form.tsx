"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { saveCohort, type CohortFormState } from "@/app/admin/actions";
import { ACTIVITIES } from "@/lib/application";
import type { AdminCohort } from "@/lib/admin-data";
import { secToPace } from "@/lib/pace";

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "field span-2" : "field"}>
      <label>
        <span className="field-label">{label}</span>
        {children}
      </label>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function CohortForm({ cohort: c }: { cohort: AdminCohort | null }) {
  const [state, action, pending] = useActionState<CohortFormState, FormData>(saveCohort, {});
  return (
    <form
      className="join-card admin-form"
      onSubmit={(e) => {
        // Submit without React's automatic form reset, so a validation error keeps what was typed.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {c && <input type="hidden" name="id" value={c.id} />}

      <h2 className="admin-h2">Basics</h2>
      <div className="fields two">
        <Field label="Name" wide>
          <input className="input" name="name" required defaultValue={c?.name ?? ""} placeholder="Tata Mumbai Marathon" />
        </Field>
        <Field label="Link name" hint="The page lives at /c/<link name>. Lowercase, numbers and hyphens.">
          <input className="input" name="slug" required defaultValue={c?.slug ?? ""} placeholder="tata-mumbai-2027" />
        </Field>
        <Field label="Type">
          <select className="input" name="kind" defaultValue={c?.kind ?? "goal"}>
            <option value="race">Race cohort</option>
            <option value="goal">Goal cohort</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="input" name="status" defaultValue={c?.status ?? "forming"}>
            <option value="forming">Forming (Join this cohort)</option>
            <option value="waitlist">Waitlist (Join the waitlist)</option>
            <option value="active">Training now</option>
            <option value="done">Finished (hidden from home page)</option>
          </select>
        </Field>
        <Field label="Activity">
          <select className="input" name="activity" defaultValue={c?.activity ?? "Running"}>
            {ACTIVITIES.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="Weeks of training">
          <input className="input" name="weeks" type="number" min={1} max={52} defaultValue={c?.weeks ?? ""} />
        </Field>
        <Field label="Subtitle (goal cohorts)" hint="Shown under the name, like “Race in Feb 2027”." wide>
          <input className="input" name="subtitle" defaultValue={c?.subtitle ?? ""} />
        </Field>
      </div>

      <h2 className="admin-h2">Race (race cohorts)</h2>
      <div className="fields two">
        <Field label="Race city">
          <input className="input" name="race_city" defaultValue={c?.race_city ?? ""} placeholder="Mumbai" />
        </Field>
        <Field label="Race date">
          <input className="input" name="race_date" type="date" defaultValue={c?.race_date ?? ""} />
        </Field>
        <Field label="Race date text, if no exact date" hint="Like “Oct 2027, date to be announced”." wide>
          <input className="input" name="race_date_label" defaultValue={c?.race_date_label ?? ""} />
        </Field>
        <Field label="Distances" hint="One per line, like “Half · 21.1 km”.">
          <textarea className="input textarea" name="distances" rows={3} defaultValue={c?.distances.join("\n") ?? ""} />
        </Field>
        <Field label="Training" hint="Like “Pace pods of 3 to 6, matched on easy pace”.">
          <textarea className="input textarea" name="training" rows={3} defaultValue={c?.training ?? ""} />
        </Field>
      </div>

      <h2 className="admin-h2">Where and when</h2>
      <div className="fields two">
        <Field label="Area" wide>
          <input className="input" name="area" defaultValue={c?.area ?? ""} placeholder="Gachibowli and Financial District" />
        </Field>
        <Field label="Meeting point">
          <input className="input" name="meeting_point" defaultValue={c?.meeting_point ?? ""} placeholder="Gachibowli Stadium, Gate 2" />
        </Field>
        <Field label="Google Maps link">
          <input className="input" name="maps_url" type="url" defaultValue={c?.maps_url ?? ""} placeholder="https://maps.app.goo.gl/…" />
        </Field>
        <Field label="Sessions" hint="One per line, like “Tue and Thu, 6:00 AM”." wide>
          <textarea className="input textarea" name="sessions" rows={3} defaultValue={c?.sessions.join("\n") ?? ""} />
        </Field>
        <Field label="Starts on">
          <input className="input" name="starts_on" type="date" defaultValue={c?.starts_on ?? ""} />
        </Field>
        <Field label="Start text, if no exact date" hint="Like “July 2027”.">
          <input className="input" name="starts_label" defaultValue={c?.starts_label ?? ""} />
        </Field>
      </div>

      <h2 className="admin-h2">Pace band</h2>
      <div className="fields two">
        <Field label="Fastest easy pace (/km)">
          <input className="input" name="pace_min" defaultValue={c?.pace_min_sec != null ? secToPace(c.pace_min_sec) : ""} placeholder="6:30" inputMode="decimal" />
        </Field>
        <Field label="Slowest easy pace (/km)">
          <input className="input" name="pace_max" defaultValue={c?.pace_max_sec != null ? secToPace(c.pace_max_sec) : ""} placeholder="7:15" inputMode="decimal" />
        </Field>
        <Field label="Pace note" hint="Added after the band, like “heart rate in Zone 2”." wide>
          <input className="input" name="pace_note" defaultValue={c?.pace_note ?? ""} />
        </Field>
      </div>

      <h2 className="admin-h2">Join form</h2>
      <div className="fields two">
        <Field label="Label in the form" hint="Shown as “Joining …”.">
          <input className="input" name="join_label" defaultValue={c?.join_label ?? ""} placeholder="Half Marathon · Gachibowli" />
        </Field>
        <Field label="Pre-filled target">
          <input className="input" name="join_target" defaultValue={c?.join_target ?? ""} placeholder="Half marathon in Feb 2027" />
        </Field>
        <Field label="Pre-filled target month">
          <input className="input" name="target_month" type="month" defaultValue={c?.target_month?.slice(0, 7) ?? ""} />
        </Field>
        <Field label="Order on the page" hint="Smaller numbers first.">
          <input className="input" name="sort_order" type="number" defaultValue={c?.sort_order ?? 100} />
        </Field>
      </div>

      <h2 className="admin-h2">Private</h2>
      <div className="fields">
        <Field label="WhatsApp group link" hint="Never shown publicly. Members get it in Phase 2.">
          <input className="input" name="whatsapp_link" defaultValue={c?.whatsapp_link ?? ""} placeholder="https://chat.whatsapp.com/…" />
        </Field>
        <label className="consent">
          <input type="checkbox" name="published" defaultChecked={c?.published ?? false} />
          <span>Published: show on the home page and at its link.</span>
        </label>
      </div>

      <div className="panel-actions">
        <Link className="btn btn-secondary" href="/admin/cohorts">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save cohort"}
        </button>
      </div>
      <p className="err submit-err" role="alert">
        {state.error ?? ""}
      </p>
    </form>
  );
}
