import type { NextConfig } from "next";

/**
 * Classic page caching (ISR): pages are prerendered at build and refreshed every 5 minutes,
 * or immediately after an admin edit (revalidatePath). Cache Components ("use cache") is off:
 * on Netlify it failed on-demand renders of /c/[slug] (27 Oct 2026).
 */
const nextConfig: NextConfig = {};

export default nextConfig;
