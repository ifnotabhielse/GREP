import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { raceLine, startsText } from "@/components/cohort-card";
import { getPublishedCohort } from "@/lib/cohorts";
import { secToPace } from "@/lib/pace";

export const alt = "A GREP training cohort";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

const fontDir = join(process.cwd(), "node_modules/@fontsource/inter/files");
const fonts = Promise.all([
  readFile(join(fontDir, "inter-latin-400-normal.woff")),
  readFile(join(fontDir, "inter-latin-700-normal.woff")),
]);

/** The link preview shown in WhatsApp and other apps: black card, G mark, cohort name, key facts. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getPublishedCohort(slug);
  const name = c?.name ?? "GREP";
  const line = c ? (c.kind === "race" ? raceLine(c) : c.subtitle ?? "") : "Find your 6 AM people.";
  const facts = c
    ? [
        c.pace_min_sec != null && c.pace_max_sec != null ? `Easy pace ${secToPace(c.pace_min_sec)}–${secToPace(c.pace_max_sec)} /km` : null,
        c.area,
        startsText(c) ? `Starts ${startsText(c)}` : null,
      ].filter(Boolean)
    : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#000", color: "#f5f5f7", padding: 72, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <path d="M20 8H12A8 8 0 0 0 12 24H20A8 8 0 0 0 28 16H21" fill="none" stroke="#f5f5f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="25.66" cy="10.34" r="2.3" fill="#2997ff" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>GREP</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 30, color: "#2997ff", fontWeight: 600 }}>{c ? `${c.kind === "race" ? "Race" : "Goal"} cohort · Hyderabad` : "Now forming in Hyderabad"}</div>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>{name}</div>
          <div style={{ fontSize: 38, color: "#a1a1a6" }}>{line}</div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {facts.map((f) => (
            <div key={f as string} style={{ fontSize: 26, padding: "10px 22px", borderRadius: 999, background: "#1d1d1f", border: "1px solid rgba(255,255,255,.18)" }}>
              {f}
            </div>
          ))}
          <div style={{ fontSize: 26, padding: "10px 22px", borderRadius: 999, background: "#0071e3", color: "#fff" }}>3 to 6 people at your pace</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: (await fonts)[0], weight: 400, style: "normal" },
        { name: "Inter", data: (await fonts)[1], weight: 700, style: "normal" },
      ],
    },
  );
}
