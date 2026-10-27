"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { submitApplication } from "@/app/actions";
import {
  ACTIVITIES, AREAS, CITIES, DAYS, DEVICES, EMPTY_INPUT, LEVELS, SESSIONS, STEP_NAMES, TARGET_PLACEHOLDERS, TIMES,
  normPhone, showsDistance, showsPace, validateAll, validateStep,
  type ApplicationInput, type FieldErrors,
} from "@/lib/application";
import type { CohortPreset } from "@/lib/cohorts";
import { upcomingMonths } from "@/lib/format";
import { paceToSec, secToPace } from "@/lib/pace";
import { JOIN_EVENT } from "./cohort-join-button";

const DRAFT_KEY = "grep-draft-v2";
type Draft = { v: Partial<ApplicationInput>; label?: string };

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable */
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Keep only well-formed values from a stored draft. */
function sanitizeDraft(v: Partial<ApplicationInput>): Partial<ApplicationInput> {
  const out: Partial<ApplicationInput> = {};
  const strKeys = ["name", "age", "email", "city", "cityOther", "area", "phone", "activity", "target", "month", "cohort", "level", "sessions", "pace", "distance", "best"] as const;
  for (const k of strKeys) if (typeof v[k] === "string") out[k] = v[k] as string;
  for (const k of ["devices", "days", "times"] as const) {
    if (Array.isArray(v[k])) out[k] = (v[k] as unknown[]).filter((x): x is string => typeof x === "string");
  }
  return out;
}

type Done = { first: string; phone: string };

export function JoinForm({ presets }: { presets: CohortPreset[] }) {
  const [v, setV] = useState<ApplicationInput>(EMPTY_INPUT);
  const [cohortLabel, setCohortLabel] = useState("");
  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [shareNote, setShareNote] = useState("");
  const [loaded, setLoaded] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const botRef = useRef<HTMLInputElement>(null);
  const lastPreset = useRef({ target: "", month: "" });
  const pendingFocus = useRef<string | null>(null);
  const navigated = useRef(false);

  // ---------- Mount: months, draft, ?cohort= ----------
  // Reads browser-only state (date, localStorage, URL) once after hydration, like the original page's script.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMonths(upcomingMonths(15));
    const d = readDraft();
    let next: ApplicationInput = { ...EMPTY_INPUT };
    let label = "";
    if (d?.v) {
      next = { ...next, ...sanitizeDraft(d.v), consent: false };
      label = typeof d.label === "string" ? d.label : "";
    }
    const slug = new URLSearchParams(window.location.search).get("cohort");
    const p = slug ? presets.find((x) => x.slug === slug) : undefined;
    if (p) {
      next = {
        ...next,
        cohort: p.slug,
        activity: p.activity,
        target: next.target.trim() ? next.target : p.target,
        month: p.month && !next.month ? p.month : next.month,
      };
      label = p.label;
      lastPreset.current = { target: p.target, month: p.month };
    }
    if (next.cohort && !presets.some((x) => x.slug === next.cohort)) {
      next.cohort = "";
      label = "";
    }
    setV(next);
    setCohortLabel(label);
    setLoaded(true);
  }, [presets]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save a draft in this browser as people type.
  useEffect(() => {
    if (!loaded || done) return;
    const { consent: _c, ...rest } = v;
    void _c;
    writeDraft({ v: rest, label: cohortLabel });
  }, [v, cohortLabel, loaded, done]);

  // ---------- Field helpers ----------
  const clearError = useCallback((key: string) => {
    setErrors((e) => {
      if (!(key in e)) return e;
      const n = { ...e };
      delete n[key];
      return n;
    });
  }, []);

  const set = <K extends keyof ApplicationInput>(k: K, value: ApplicationInput[K], errKey?: string) => {
    setV((s) => ({ ...s, [k]: value }));
    if (errKey) clearError(errKey);
  };

  const toggle = (group: "activity" | "level" | "sessions" | "devices" | "days" | "times", value: string) => {
    setV((s) => {
      if (group === "devices" || group === "days" || group === "times") {
        let arr = s[group].slice();
        const i = arr.indexOf(value);
        if (i >= 0) arr.splice(i, 1);
        else arr.push(value);
        if (group === "devices") {
          arr = value === "Nothing" && i < 0 ? ["Nothing"] : arr.filter((x) => x !== "Nothing");
        }
        return { ...s, [group]: arr };
      }
      return { ...s, [group]: value };
    });
    clearError(group);
  };

  // ---------- Errors ----------
  const showErrors = (list: FieldErrors) => {
    setErrors(Object.fromEntries(list));
    pendingFocus.current = list[0]?.[0] ?? null;
  };
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    const el = (document.getElementById(key) as HTMLElement | null) || document.querySelector<HTMLElement>(`#g-${key} button`);
    el?.focus();
  }, [errors]);

  // ---------- Navigation ----------
  const go = (i: number) => {
    navigated.current = true;
    setCurrent(i);
  };
  useEffect(() => {
    if (!navigated.current) return;
    const card = cardRef.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (card && card.getBoundingClientRect().top < 60) card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    if (pendingFocus.current) return;
    const h = formRef.current?.querySelector<HTMLElement>(`[data-panel="${current}"] h3`);
    h?.focus({ preventScroll: true });
  }, [current]);

  const next = () => {
    const errs = validateStep(current, v);
    if (errs.length) return showErrors(errs);
    go(current + 1);
  };

  // ---------- Cohort shortcuts ----------
  useEffect(() => {
    const onJoin = (e: Event) => {
      const p = (e as CustomEvent<CohortPreset>).detail;
      setV((s) => {
        const target = !s.target.trim() || s.target === lastPreset.current.target ? p.target : s.target;
        const month = p.month && (!s.month || s.month === lastPreset.current.month) ? p.month : s.month;
        return { ...s, cohort: p.slug, activity: p.activity, target, month };
      });
      lastPreset.current = { target: p.target, month: p.month };
      setCohortLabel(p.label);
      clearError("activity");
      clearError("f-target");
      setCurrent((c) => (c === 5 ? 0 : c));
      setDone(null);
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("join")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    };
    window.addEventListener(JOIN_EVENT, onJoin);
    return () => window.removeEventListener(JOIN_EVENT, onJoin);
  }, [clearError]);

  // ---------- Submit ----------
  const send = async () => {
    if (sending) return;
    const bad = validateAll(v);
    if (bad) {
      go(bad.step);
      showErrors(bad.errors);
      return;
    }
    setSending(true);
    setSubmitErr("");
    try {
      const res = await submitApplication(v, botRef.current?.value ?? "");
      if (res.ok) {
        clearDraft();
        setDone({ first: res.firstName, phone: res.phone });
        setShareNote("");
        go(5);
      } else if (res.step != null && res.errors?.length) {
        go(res.step);
        showErrors(res.errors);
      } else {
        setSubmitErr(res.message || "We couldn't send your application. Check your connection and try again.");
      }
    } catch {
      setSubmitErr("We couldn't send your application. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (current < 4) next();
    else if (current === 4) void send();
  };

  const share = () => {
    const url = `${location.origin}/`;
    const copyLink = () => {
      try {
        navigator.clipboard.writeText(url).then(
          () => setShareNote("Link copied. Send it to someone you'd train with."),
          () => setShareNote(`Share this link: ${url}`),
        );
      } catch {
        setShareNote(`Share this link: ${url}`);
      }
    };
    if (navigator.share) {
      navigator
        .share({ title: "GREP", text: "Train with people at your pace, toward the same goal. Join me on GREP.", url })
        .catch((e: unknown) => {
          if (!e || (e as Error).name !== "AbortError") copyLink();
        });
    } else copyLink();
  };

  // ---------- Render helpers ----------
  const inv = (key: string) => (errors[key] ? { "aria-invalid": true as const } : {});
  const err = (id: string) => (
    <p className="err" id={`err-${id}`} aria-live="polite">
      {errors[id] || ""}
    </p>
  );
  const chip = (group: "activity" | "level" | "sessions" | "devices" | "days" | "times", value: string, label: React.ReactNode) => {
    const cur = v[group];
    const on = Array.isArray(cur) ? cur.includes(value) : cur === value;
    return (
      <button key={value} type="button" className="chip" data-value={value} aria-pressed={on ? "true" : "false"} onClick={() => toggle(group, value)}>
        {label}
      </button>
    );
  };
  const groupClass = (base: string, key: string) => (errors[key] ? `${base} invalid` : base);

  const pace = showsPace(v.activity);
  const distance = showsDistance(v.activity);
  const monthLabel = months.find((m) => m.value === v.month)?.label || "";

  const reviewSections = (() => {
    if (current !== 4) return [];
    const phone = `+91 ${normPhone(v.phone)}`;
    const p = pace && v.pace.trim() ? (Number.isNaN(paceToSec(v.pace.trim())) ? v.pace.trim() : secToPace(paceToSec(v.pace.trim()))) + " /km" : "";
    const sections: { title: string; step: number; rows: [string, string][] }[] = [
      { title: "About you", step: 0, rows: [["Name", v.name.trim()], ["Age", v.age.trim()], ["Email", v.email.trim()], ["City", v.city === "Other" ? v.cityOther.trim() : v.city], ["Area", v.area.trim()], ["WhatsApp", phone]] },
      { title: "Your goal", step: 1, rows: [["Activity", v.activity], ["Next target", v.target.trim()], ["Target date", monthLabel || "No date yet"], ["Cohort", v.cohort ? cohortLabel : ""]] },
      {
        title: "Where you are now",
        step: 2,
        rows: [
          ["Level", v.level],
          ["Sessions per week", SESSIONS.find((s) => s.value === v.sessions)?.label || ""],
          ["Easy pace", p],
          ["Weekly distance", distance && v.distance.trim() ? `${v.distance.trim()} km a week` : ""],
          ["Recent best", v.best.trim()],
          ["Tracks with", DEVICES.filter((d) => v.devices.includes(d.value)).map((d) => d.label).join(", ")],
        ],
      },
      {
        title: "When you can train",
        step: 3,
        rows: [
          ["Days", DAYS.filter((d) => v.days.includes(d)).join(", ")],
          ["Times", TIMES.filter((t) => v.times.includes(t.value)).map((t) => t.short).join(", ")],
        ],
      },
    ];
    return sections;
  })();

  const reviewNodes = reviewSections.map((sec) => (
      <div className="rv-sec" key={sec.title}>
        <div className="rv-head">
          <h4>{sec.title}</h4>
          <button type="button" className="rv-edit" data-edit={sec.step} aria-label={`Edit ${sec.title.toLowerCase()}`}>
            Edit
          </button>
        </div>
        <dl className="rv-list">
          {sec.rows
            .filter((r) => r[1])
            .map(([k, val]) => (
              <div className="rv-row" key={k}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
        </dl>
      </div>
    ));

  const progressText = current < 4 ? `Step ${current + 1} of 4 · ${STEP_NAMES[current]}` : current === 4 ? "Review" : "";

  return (
    <div className="join-card" id="join-card" ref={cardRef}>
      <div className="progress-wrap" hidden={current === 5}>
        <ol className="progress" aria-label="Form progress">
          {STEP_NAMES.map((n, i) => (
            <li key={n} className={i < current ? "is-done" : i === current ? "is-current" : undefined}>
              <span className="bar"></span>
              <span className="lbl">{n}</span>
            </li>
          ))}
        </ol>
        <p className="progress-text" id="progress-text" aria-live="polite">
          {progressText}
        </p>
      </div>

      <div className="joining" id="joining" hidden={!v.cohort || current === 5}>
        <span>
          Joining <b id="joining-name">{cohortLabel}</b>
        </span>
        <button
          type="button"
          id="joining-clear"
          onClick={() => {
            set("cohort", "");
            setCohortLabel("");
          }}
        >
          Remove
        </button>
      </div>

      <form id="join-form" name="grep-signup" noValidate onSubmit={onSubmit} ref={formRef}>
        <p className="hp" aria-hidden="true">
          <label htmlFor="f-bot">Leave this field empty</label>
          <input id="f-bot" name="bot-field" type="text" tabIndex={-1} autoComplete="off" ref={botRef} />
        </p>

        {/* Step 1 */}
        <div className="panel" data-panel="0" hidden={current !== 0}>
          <h3 tabIndex={-1}>About you</h3>
          <p className="panel-sub">So we can find people near you.</p>
          <div className="fields two">
            <div className="field span-2">
              <label htmlFor="f-name">Full name</label>
              <input className="input" id="f-name" name="name" type="text" autoComplete="name" placeholder="Your name" value={v.name} onChange={(e) => set("name", e.target.value, "f-name")} {...inv("f-name")} />
              {err("f-name")}
            </div>
            <div className="field">
              <label htmlFor="f-age">Age</label>
              <input className="input" id="f-age" name="age" type="number" inputMode="numeric" min={18} max={80} placeholder="27" value={v.age} onChange={(e) => set("age", e.target.value, "f-age")} {...inv("f-age")} />
              {err("f-age")}
            </div>
            <div className="field">
              <label htmlFor="f-city">City</label>
              <select className="input" id="f-city" name="city" value={v.city} onChange={(e) => set("city", e.target.value, "f-city")}>
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field span-2" id="wrap-city-other" hidden={v.city !== "Other"}>
              <label htmlFor="f-city-other">Your city</label>
              <input className="input" id="f-city-other" type="text" autoComplete="address-level2" placeholder="Kolkata" value={v.cityOther} onChange={(e) => set("cityOther", e.target.value, "f-city-other")} {...inv("f-city-other")} />
              {err("f-city-other")}
            </div>
            <div className="field span-2">
              <label htmlFor="f-area">Area</label>
              <input className="input" id="f-area" name="area" type="text" list="areas" autoComplete="off" placeholder="Gachibowli" value={v.area} onChange={(e) => set("area", e.target.value, "f-area")} {...inv("f-area")} />
              <datalist id="areas">
                {AREAS.map((a) => (
                  <option key={a} value={a}></option>
                ))}
              </datalist>
              <p className="hint">We pick a meeting point near here.</p>
              {err("f-area")}
            </div>
            <div className="field span-2">
              <label htmlFor="f-phone">WhatsApp number</label>
              <div className="affix">
                <span className="pfx" aria-hidden="true">
                  +91
                </span>
                <input className="input" id="f-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="98765 43210" value={v.phone} onChange={(e) => set("phone", e.target.value, "f-phone")} {...inv("f-phone")} />
              </div>
              {err("f-phone")}
            </div>
            <div className="field span-2">
              <label htmlFor="f-email">Email</label>
              <input className="input" id="f-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={v.email} onChange={(e) => set("email", e.target.value, "f-email")} {...inv("f-email")} />
              <p className="hint">For your confirmation. We don&apos;t share it.</p>
              {err("f-email")}
            </div>
          </div>
          <div className="panel-actions end">
            <button type="button" className="btn btn-primary" data-next onClick={next}>
              Continue
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="panel" data-panel="1" hidden={current !== 1}>
          <h3 tabIndex={-1}>Your goal</h3>
          <p className="panel-sub">What you&apos;re training for next.</p>
          <div className="fields">
            <fieldset className="field">
              <legend className="legend">Activity</legend>
              <div className={groupClass("chips", "activity")} data-group="activity" id="g-activity">
                {ACTIVITIES.map((a) => chip("activity", a, a))}
              </div>
              {err("activity")}
            </fieldset>
            <div className="field">
              <label htmlFor="f-target">Next target</label>
              <input className="input" id="f-target" name="target" type="text" autoComplete="off" placeholder={TARGET_PLACEHOLDERS[v.activity] || TARGET_PLACEHOLDERS.Running} value={v.target} onChange={(e) => set("target", e.target.value, "f-target")} {...inv("f-target")} />
              <p className="hint">A race, a distance or a number. The more specific, the better the match.</p>
              {err("f-target")}
            </div>
            <div className="field">
              <label htmlFor="f-month">
                Target date <span className="opt">(optional)</span>
              </label>
              <select className="input" id="f-month" name="month" value={v.month} onChange={(e) => set("month", e.target.value, "f-month")}>
                <option value="">No date yet</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
                {v.month && months.length > 0 && !months.some((m) => m.value === v.month) && <option value={v.month}>{v.month}</option>}
              </select>
            </div>
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-secondary" data-back onClick={() => go(Math.max(0, current - 1))}>
              Back
            </button>
            <button type="button" className="btn btn-primary" data-next onClick={next}>
              Continue
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="panel" data-panel="2" hidden={current !== 2}>
          <h3 tabIndex={-1}>Where you are now</h3>
          <p className="panel-sub">Rough numbers are fine. They decide who you&apos;re matched with.</p>
          <div className="fields two">
            <fieldset className="field span-2">
              <legend className="legend">Level</legend>
              <div className={groupClass("seg", "level")} data-group="level" id="g-level">
                {LEVELS.map((l) =>
                  chip(
                    "level",
                    l.value,
                    <>
                      {l.value}
                      <small>{l.hint}</small>
                    </>,
                  ),
                )}
              </div>
              {err("level")}
            </fieldset>
            <fieldset className="field span-2">
              <legend className="legend">Sessions per week right now</legend>
              <div className={groupClass("seg", "sessions")} data-group="sessions" id="g-sessions">
                {SESSIONS.map((s) => chip("sessions", s.value, s.label))}
              </div>
              {err("sessions")}
            </fieldset>
            <div className="field" id="wrap-pace" hidden={!pace}>
              <label htmlFor="f-pace">
                Easy pace <span className="opt">(optional)</span>
              </label>
              <div className="affix">
                <input className="input" id="f-pace" name="pace" type="text" inputMode="decimal" autoComplete="off" placeholder="6:45" value={v.pace} onChange={(e) => set("pace", e.target.value, "f-pace")} {...inv("f-pace")} />
                <span className="sfx" aria-hidden="true">
                  /km
                </span>
              </div>
              <p className="hint">A pace you can hold while talking.</p>
              {err("f-pace")}
            </div>
            <div className="field" id="wrap-distance" hidden={!distance}>
              <label htmlFor="f-distance">
                Weekly distance <span className="opt">(optional)</span>
              </label>
              <div className="affix">
                <input className="input" id="f-distance" name="distance" type="number" inputMode="decimal" min={0} max={1000} placeholder="20" value={v.distance} onChange={(e) => set("distance", e.target.value, "f-distance")} {...inv("f-distance")} />
                <span className="sfx" aria-hidden="true">
                  km
                </span>
              </div>
              <p className="hint">Average over the last 4 weeks.</p>
              {err("f-distance")}
            </div>
            <div className="field span-2">
              <label htmlFor="f-best">
                Recent best <span className="opt">(optional)</span>
              </label>
              <input className="input" id="f-best" name="best" type="text" autoComplete="off" placeholder="10K in 58:30" value={v.best} onChange={(e) => set("best", e.target.value, "f-best")} {...inv("f-best")} />
              {err("f-best")}
            </div>
            <fieldset className="field span-2">
              <legend className="legend">
                What you track with <span className="opt">(optional)</span>
              </legend>
              <div className="chips" data-group="devices" data-multi="true" id="g-devices">
                {DEVICES.map((d) => chip("devices", d.value, d.label))}
              </div>
            </fieldset>
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-secondary" data-back onClick={() => go(Math.max(0, current - 1))}>
              Back
            </button>
            <button type="button" className="btn btn-primary" data-next onClick={next}>
              Continue
            </button>
          </div>
        </div>

        {/* Step 4 */}
        <div className="panel" data-panel="3" hidden={current !== 3}>
          <h3 tabIndex={-1}>When you can train</h3>
          <p className="panel-sub">Pick every slot that works. More slots means a faster match.</p>
          <div className="fields">
            <fieldset className="field">
              <legend className="legend">Days</legend>
              <div className={groupClass("chips", "days")} data-group="days" data-multi="true" id="g-days">
                {DAYS.map((d) => chip("days", d, d))}
              </div>
              {err("days")}
            </fieldset>
            <fieldset className="field">
              <legend className="legend">Times</legend>
              <div className={groupClass("chips", "times")} data-group="times" data-multi="true" id="g-times">
                {TIMES.map((t) => chip("times", t.value, t.label))}
              </div>
              {err("times")}
            </fieldset>
            <div className="field">
              <label className="consent" htmlFor="f-consent">
                <input type="checkbox" id="f-consent" name="consent" checked={v.consent} onChange={(e) => set("consent", e.target.checked, "f-consent")} {...inv("f-consent")} />
                <span>
                  I&apos;m 18 or older, I agree to the{" "}
                  <Link href="/terms" target="_blank">
                    terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank">
                    privacy policy
                  </Link>
                  , and GREP can contact me on WhatsApp and email about cohorts.
                </span>
              </label>
              {err("f-consent")}
            </div>
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-secondary" data-back onClick={() => go(Math.max(0, current - 1))}>
              Back
            </button>
            <button type="button" className="btn btn-primary" data-next onClick={next}>
              Review
            </button>
          </div>
        </div>

        {/* Review */}
        <div className="panel" data-panel="4" hidden={current !== 4}>
          <h3 tabIndex={-1}>Check your details</h3>
          <p className="panel-sub">Edit anything before you send it.</p>
          <div
            className="review"
            id="review"
            onClick={(e) => {
              const b = (e.target as HTMLElement).closest<HTMLElement>("[data-edit]");
              if (b) go(Number(b.dataset.edit));
            }}
          >
            {reviewNodes}
          </div>
          <div className="panel-actions">
            <button type="button" className="btn btn-secondary" data-back onClick={() => go(Math.max(0, current - 1))}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" id="submit-btn" disabled={sending}>
              {sending ? "Submitting…" : "Submit application"}
            </button>
          </div>
          <p className="err submit-err" id="err-submit" aria-live="polite">
            {submitErr}
          </p>
        </div>

        {/* Done */}
        <div className="panel done" data-panel="5" hidden={current !== 5}>
          <div className="done-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h3 tabIndex={-1} id="done-title">
            {done ? `You're in, ${done.first}.` : "You're in."}
          </h3>
          <p className="panel-sub" id="done-sub">
            {done ? `We'll message you on WhatsApp at ${done.phone} once we have your match.` : "We'll message you on WhatsApp once we have your match."}
          </p>
          <div className="cta-row">
            <button type="button" className="btn btn-primary" id="share-btn" onClick={share}>
              Invite a training partner
            </button>
          </div>
          <p className="share-note" id="share-note" aria-live="polite">
            {shareNote}
          </p>
        </div>
      </form>
    </div>
  );
}
