/**
 * Import the old Netlify Forms sign-ups into `applications`.
 *
 *   1. Netlify → your site → Forms → grep-signup → Download as CSV
 *   2. DATABASE_URL="<Supabase pooler string>" npx tsx scripts/import-netlify-forms.ts ~/Downloads/grep-signup.csv --dry-run
 *   3. Check the summary, then run again without --dry-run.
 *
 * Safe to run twice: a row with the same phone and submission time is skipped.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { mapNetlifyRow, parseCsv } from "../lib/netlify-import";

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error("Usage: tsx scripts/import-netlify-forms.ts <export.csv> [--dry-run]");
  const dry = flag === "--dry-run";
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL");
  const local = /@(127\.0\.0\.1|localhost)[:/]/.test(url);
  const sql = postgres(url, { prepare: false, max: 1, ssl: local ? false : "require" });

  const records = parseCsv(readFileSync(file, "utf8"));
  const cohorts = await sql<{ id: string; join_label: string | null; name: string }[]>`select id::text, join_label, name from public.cohorts`;
  let added = 0;
  let skipped = 0;
  const problems: string[] = [];

  for (const [i, rec] of records.entries()) {
    const { row, error } = mapNetlifyRow(rec);
    if (!row) {
      problems.push(`line ${i + 2}: ${error}`);
      continue;
    }
    const [dupe] = await sql`select 1 from public.applications where phone = ${row.phone} and created_at = ${row.created_at}`;
    if (dupe) {
      skipped++;
      continue;
    }
    const cohort = row.cohort_label ? cohorts.find((c) => c.join_label === row.cohort_label || c.name === row.cohort_label) : undefined;
    if (row.cohort_label && !cohort) problems.push(`line ${i + 2}: cohort "${row.cohort_label}" not found, imported without it`);
    const { cohort_label: _l, ...values } = row;
    void _l;
    if (!dry) {
      await sql`insert into public.applications ${sql({ ...values, requested_cohort_id: cohort?.id ?? null })}`;
    }
    added++;
  }

  console.log(`${dry ? "[dry run] would add" : "Added"} ${added}, skipped ${skipped} already imported, ${problems.length} problems, of ${records.length} rows.`);
  for (const p of problems) console.log(`  - ${p}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
