import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createLocalDb } from "../../scripts/local-db";

let db: PGlite;
beforeAll(async () => {
  db = await createLocalDb();
});

const okApp = {
  name: "Test Runner",
  email: "t@example.com",
  phone: "+919876543210",
  age: 27,
  city: "Hyderabad",
  area: "Gachibowli",
  activity: "Running",
  target: "Half marathon under 2:30",
  consent_version: "2026-10-27",
};
async function insertApp(over: Record<string, unknown> = {}) {
  const row = { ...okApp, ...over };
  const cols = Object.keys(row);
  const vals = Object.values(row);
  return db.query(
    `insert into applications (${cols.join(",")}, consent_at) values (${cols.map((_, i) => `$${i + 1}`).join(",")}, now()) returning id`,
    vals,
  );
}
async function asAnon<T>(fn: () => Promise<T>) {
  await db.exec("set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

describe("seed", () => {
  it("has the 7 cohorts from the static page, all published", async () => {
    const r = await db.query<{ slug: string }>("select slug from cohorts where published order by sort_order");
    expect(r.rows.map((x) => x.slug)).toEqual([
      "tata-mumbai-2027",
      "tcs-world-10k-2027",
      "delhi-half-2027",
      "ironman-703-goa-2027",
      "half-marathon-feb-2027",
      "first-10k",
      "zone-2-base",
    ]);
  });
});

describe("application constraints", () => {
  it("accepts a valid web sign-up", async () => {
    await expect(insertApp()).resolves.toBeTruthy();
  });
  it.each([
    ["age 17", { age: 17 }],
    ["age 81", { age: 81 }],
    ["non-Indian phone", { phone: "+14155550100" }],
    ["9-digit phone", { phone: "+91987654321" }],
    ["phone starting 5", { phone: "+915876543210" }],
    ["pace 2:59", { easy_pace_sec: 179 }],
    ["pace 12:01", { easy_pace_sec: 721 }],
    ["unknown day", { days: ["Mon", "Funday"] }],
    ["bad email", { email: "nope" }],
    ["web sign-up without email", { email: null }],
    ["bad level", { level: "Elite" }],
    ["bad sessions", { sessions_per_week: "7" }],
    ["target month not 1st", { target_month: "2027-02-14" }],
  ])("rejects %s", async (_label, over) => {
    await expect(insertApp(over)).rejects.toThrow();
  });
  it("allows an imported Netlify row without email or age", async () => {
    await expect(insertApp({ email: null, age: null, source: "netlify-forms" })).resolves.toBeTruthy();
  });
});

describe("cohort constraints", () => {
  it("rejects a pace band with max below min", async () => {
    await expect(
      db.query("insert into cohorts (slug, kind, name, pace_min_sec, pace_max_sec) values ('x-bad', 'goal', 'Bad', 400, 390)"),
    ).rejects.toThrow();
  });
  it("rejects a slug with spaces or capitals", async () => {
    await expect(db.query("insert into cohorts (slug, kind, name) values ('Bad Slug', 'goal', 'Bad')")).rejects.toThrow();
  });
  it("rejects a non-WhatsApp group link", async () => {
    const c = await db.query<{ id: string }>("select id from cohorts limit 1");
    await expect(
      db.query("insert into cohort_secrets (cohort_id, whatsapp_link) values ($1, 'https://evil.example')", [c.rows[0].id]),
    ).rejects.toThrow();
  });
});

describe("row-level security for the public (anon) key", () => {
  it("can read published cohorts only", async () => {
    await db.query("insert into cohorts (slug, kind, name, published) values ('hidden-draft', 'goal', 'Hidden draft', false)");
    const r = await asAnon(() => db.query<{ slug: string }>("select slug from cohorts"));
    expect(r.rows.map((x) => x.slug)).not.toContain("hidden-draft");
    expect(r.rows).toHaveLength(7);
  });
  it.each(["applications", "admins", "cohort_secrets", "submit_attempts"])("reads 0 rows from %s", async (t) => {
    const before = await db.query<{ n: number }>(`select count(*)::int n from ${t}`);
    const r = await asAnon(() => db.query(`select * from ${t}`));
    expect(r.rows).toHaveLength(0);
    // sanity: the superuser view is unaffected
    const after = await db.query<{ n: number }>(`select count(*)::int n from ${t}`);
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });
  it("cannot insert applications directly", async () => {
    await expect(
      asAnon(() =>
        db.query(
          "insert into applications (name,email,phone,age,city,area,activity,target,consent_at,consent_version) values ('A B','a@b.co','+919876543210',30,'Hyderabad','Gachibowli','Running','10K',now(),'v')",
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("cannot change or delete cohorts", async () => {
    await asAnon(() => db.query("update cohorts set name = 'pwned'"));
    await asAnon(() => db.query("delete from cohorts"));
    const r = await db.query<{ n: number }>("select count(*)::int n from cohorts where name = 'pwned'");
    expect(r.rows[0].n).toBe(0);
    const all = await db.query<{ n: number }>("select count(*)::int n from cohorts where published");
    expect(all.rows[0].n).toBe(7);
  });
});
