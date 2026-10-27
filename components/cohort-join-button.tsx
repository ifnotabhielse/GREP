"use client";

import type { CohortPreset } from "@/lib/cohorts";

export const JOIN_EVENT = "grep:join-cohort";

/**
 * "Join this cohort". On the home page it tells the join form which cohort was picked and scrolls to it.
 * Elsewhere (a cohort's own page) it goes to the home page form with the cohort pre-selected.
 */
export function CohortJoinButton({
  preset,
  className,
  children,
  external = false,
}: {
  preset: CohortPreset;
  className: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a className={className} href={`/?cohort=${encodeURIComponent(preset.slug)}#join`}>
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      data-cohort={preset.slug}
      onClick={() => {
        window.dispatchEvent(new CustomEvent<CohortPreset>(JOIN_EVENT, { detail: preset }));
      }}
    >
      {children}
    </button>
  );
}
