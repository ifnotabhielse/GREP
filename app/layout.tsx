import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000";
const DESCRIPTION =
  "GREP matches you with 3 to 6 people who train at your pace, toward the same goal, at times you can make. Now forming in Hyderabad.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GREP · Train with people at your pace",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "GREP",
    title: "GREP · Find your 6 AM people.",
    description: DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- same font link as the original static page */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            {/* GREP mark: a G drawn as a running track seen from above; the blue dot in the gap is you, joining the track. */}
            <symbol id="g-mark" viewBox="0 0 32 32">
              <path
                d="M20 8H12A8 8 0 0 0 12 24H20A8 8 0 0 0 28 16H21"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="25.66" cy="10.34" r="2.3" style={{ fill: "var(--accent)" }} />
            </symbol>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
