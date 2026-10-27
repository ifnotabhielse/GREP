/**
 * A throwaway Postgres for local development and tests, using PGlite (Postgres compiled to WASM).
 * It applies the same migration files that run on Supabase, plus a tiny bootstrap that creates the
 * Supabase roles (`anon`, `authenticated`) so the row-level security rules can be tested as-is.
 *
 *   npx tsx scripts/local-db.ts            # serve on 127.0.0.1:54329, seeded
 *   LOCAL_DB_PORT=5433 npx tsx scripts/local-db.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const ROOT = join(__dirname, "..");

const BOOTSTRAP = `
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  end $$;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
`;

export async function createLocalDb(opts: { seed?: boolean } = {}) {
  const db = await PGlite.create({ extensions: { citext } });
  await db.exec(BOOTSTRAP);
  const dir = join(ROOT, "supabase", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, f), "utf8"));
  }
  if (opts.seed !== false) {
    await db.exec(readFileSync(join(ROOT, "supabase", "seed.sql"), "utf8"));
  }
  return db;
}

async function main() {
  const port = Number(process.env.LOCAL_DB_PORT || 54329);
  const db = await createLocalDb({ seed: process.env.LOCAL_DB_SEED !== "0" });
  const adminEmail = process.env.LOCAL_DB_ADMIN;
  if (adminEmail) await db.query("insert into public.admins (email) values ($1) on conflict do nothing", [adminEmail]);
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
  await server.start();
  console.log(`local-db ready on postgres://postgres:postgres@127.0.0.1:${port}/postgres`);
  const stop = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
