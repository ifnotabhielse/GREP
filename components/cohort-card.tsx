import Link from "next/link";
import type { Cohort } from "@/lib/cohorts";
import { toPreset } from "@/lib/cohorts";
import { formatDate, nbspTimes } from "@/lib/format";
import { bandPosition, secToPace } from "@/lib/pace";
import { CohortJoinButton } from "./cohort-join-button";

export const STATUS_PILL: Record<Cohort["status"], { text: string; wait: boolean }> = {
  forming: { text: "Forming", wait: false },
  waitlist: { text: "Waitlist", wait: true },
  active: { text: "Training", wait: true },
  done: { text: "Finished", wait: true },
};

export function joinText(c: Pick<Cohort, "status">) {
  return c.status === "forming" ? "Join this cohort" : "Join the waitlist";
}

export function raceLine(c: Cohort) {
  const when = c.race_date ? formatDate(c.race_date) : c.race_date_label;
  return [c.race_city, when].filter(Boolean).join(" · ");
}

export function startsText(c: Cohort) {
  return c.starts_on ? formatDate(c.starts_on) : c.starts_label || "";
}

export function paceText(c: Cohort) {
  if (c.pace_min_sec == null || c.pace_max_sec == null) return "";
  return `${secToPace(c.pace_min_sec)}–${secToPace(c.pace_max_sec)} /km${c.pace_note ? `, ${c.pace_note}` : ""}`;
}

export function SessionLines({ sessions }: { sessions: string[] }) {
  return (
    <>
      {sessions.map((s, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {nbspTimes(s)}
        </span>
      ))}
    </>
  );
}

export function PaceMini({ c }: { c: Cohort }) {
  if (c.pace_min_sec == null || c.pace_max_sec == null) return null;
  const { left, width } = bandPosition(c.pace_min_sec, c.pace_max_sec);
  return (
    <div
      className="mini"
      role="img"
      aria-label={`Easy pace band ${secToPace(c.pace_min_sec)} to ${secToPace(c.pace_max_sec)} per km on a scale from 5:30 to 9:00`}
    >
      <div className="mini-track">
        <span className="mini-band" style={{ left: `${left}%`, width: `${width}%` }}></span>
      </div>
      <div className="mini-labels" aria-hidden="true">
        <span>5:30</span>
        <span>9:00 /km</span>
      </div>
    </div>
  );
}

export function CohortCard({ c }: { c: Cohort }) {
  const pill = STATUS_PILL[c.status];
  const isRace = c.kind === "race";
  return (
    <article className="cohort" data-slug={c.slug}>
      <div className="cohort-top">
        <span className={pill.wait ? "pill wait" : "pill"}>{pill.text}</span>
        {c.weeks ? <span>{c.weeks} weeks</span> : null}
      </div>
      <h3>
        <Link href={`/c/${c.slug}`}>{c.name}</Link>
      </h3>
      <p className="cohort-goal">{isRace ? raceLine(c) : c.subtitle}</p>
      {isRace && c.distances.length > 0 && (
        <div className="dist" aria-label={c.distances.length > 1 ? "Distances" : "Distance"}>
          {c.distances.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      )}
      {!isRace && <PaceMini c={c} />}
      <dl className="facts">
        {isRace && c.training && (
          <div>
            <dt>Training</dt>
            <dd>{c.training}</dd>
          </div>
        )}
        {!isRace && paceText(c) && (
          <div>
            <dt>Easy pace</dt>
            <dd>{paceText(c)}</dd>
          </div>
        )}
        {c.area && (
          <div>
            <dt>Area</dt>
            <dd>{c.area}</dd>
          </div>
        )}
        {c.sessions.length > 0 && (
          <div>
            <dt>Sessions</dt>
            <dd>
              <SessionLines sessions={c.sessions} />
            </dd>
          </div>
        )}
        {startsText(c) && (
          <div>
            <dt>Starts</dt>
            <dd>{startsText(c)}</dd>
          </div>
        )}
      </dl>
      <CohortJoinButton preset={toPreset(c)} className="btn btn-secondary cohort-join">
        {joinText(c)}
      </CohortJoinButton>
    </article>
  );
}

export function CohortGroups({ cohorts }: { cohorts: Cohort[] }) {
  const races = cohorts.filter((c) => c.kind === "race");
  const goals = cohorts.filter((c) => c.kind === "goal");
  return (
    <>
      {races.length > 0 && (
        <div className="group">
          <div className="group-head">
            <h3 className="group-title">Race cohorts</h3>
            <p className="group-sub">Train together here. Race together there.</p>
          </div>
          <div className="cohort-grid races">
            {races.map((c) => (
              <CohortCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}
      {goals.length > 0 && (
        <div className="group">
          <div className="group-head">
            <h3 className="group-title">Goal cohorts</h3>
            <p className="group-sub">No race needed. Just a target and a date.</p>
          </div>
          <div className="cohort-grid">
            {goals.map((c) => (
              <CohortCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
