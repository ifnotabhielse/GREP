"use client";

import { useState } from "react";

/** Share this page (native share sheet on phones, copy link elsewhere). Same behaviour as the join form's invite button. */
export function ShareButton({ title, text, label = "Share" }: { title: string; text: string; label?: string }) {
  const [note, setNote] = useState("");
  const onClick = () => {
    const url = location.href.split("#")[0];
    const copy = () => {
      try {
        navigator.clipboard.writeText(url).then(
          () => setNote("Link copied."),
          () => setNote(`Share this link: ${url}`),
        );
      } catch {
        setNote(`Share this link: ${url}`);
      }
    };
    if (navigator.share) {
      navigator.share({ title, text, url }).catch((e: unknown) => {
        if (!e || (e as Error).name !== "AbortError") copy();
      });
    } else copy();
  };
  return (
    <>
      <button type="button" className="btn btn-secondary btn-lg" onClick={onClick}>
        {label}
      </button>
      <p className="share-note" aria-live="polite">
        {note}
      </p>
    </>
  );
}
