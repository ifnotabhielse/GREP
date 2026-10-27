import "server-only";
import postgres from "postgres";

/**
 * One Postgres client per server instance.
 *
 * Production: DATABASE_URL is Supabase's *transaction pooler* string (port 6543), which is
 * built for serverless functions. The pooler doesn't support prepared statements, so they're off.
 * Local/tests: DATABASE_URL points at scripts/local-db.ts (PGlite), no TLS.
 */
const globalForDb = globalThis as unknown as { __grepSql?: postgres.Sql };

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /@(127\.0\.0\.1|localhost)[:/]/.test(url);
  return postgres(url, {
    prepare: false,
    ssl: local ? false : "require",
    max: 1, // one per serverless instance; PGlite (local) is single-connection too
    idle_timeout: 20,
    connect_timeout: 15,
    transform: { undefined: null },
  });
}

export function db(): postgres.Sql {
  if (!globalForDb.__grepSql) globalForDb.__grepSql = connect();
  return globalForDb.__grepSql;
}
