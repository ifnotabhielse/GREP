import "server-only";
import { createHash } from "node:crypto";

/**
 * The visitor's IP, hashed with a server-side salt so the raw address is never stored.
 * On Netlify, `x-nf-client-connection-ip` is set by Netlify's edge (assumed not spoofable by clients).
 * Off Netlify (local runs and tests), fall back to the first `x-forwarded-for` hop.
 */
export function clientIpHash(h: Headers): string {
  const onNetlify = Boolean(process.env.NETLIFY);
  const ip =
    h.get("x-nf-client-connection-ip") ||
    (onNetlify ? "" : (h.get("x-forwarded-for") || "").split(",")[0].trim()) ||
    "unknown";
  const salt = process.env.IP_HASH_SALT || "dev-only-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** The site's public origin, for links in emails. */
export function siteUrl(h?: Headers): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;
  if (env) return env.replace(/\/$/, "");
  const host = h?.get("x-forwarded-host") || h?.get("host");
  const proto = h?.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}
