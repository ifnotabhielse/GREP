import { describe, expect, it } from "vitest";
import { createLocalDb } from "../../scripts/local-db";
import { mapNetlifyRow, parseCsv } from "../../lib/netlify-import";

// Shape of a Netlify Forms export: the form's own fields, plus created_at, ip, user_agent and referrer.
const CSV = [
  "name,age,city,area,phone,activity,target,month,cohort,level,sessions,pace,distance,best,devices,days,times,consent,created_at,ip,user_agent,referrer",
  '"Rao, Asha",29,Hyderabad,Gachibowli,+91 98765 43210,Running,"Half marathon, sub 2:30",February 2027,Half Marathon · Gachibowli,Consistent,3–4,6:52 /km,22 km a week,10K in 58:30,"Garmin, Strava","Tue, Sat","Early morning (5–7 AM), Evening (6–8 PM)",yes,2026-10-20T01:15:00.000Z,1.2.3.4,UA,https://samepace.netlify.app/',
  "Bad Phone,30,Hyderabad,Kondapur,12345,Running,10K,No date yet,,Starting out,1–2,,,,Nothing yet,Sun,Morning (7–9 AM),yes,2026-10-21T01:15:00.000Z,,,",
].join("\r\n");

describe("Netlify Forms import", () => {
  it("parses quoted CSV", () => {
    const rows = parseCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Rao, Asha");
    expect(rows[0].target).toBe("Half marathon, sub 2:30");
  });

  it("converts display values back to stored values", () => {
    const { row } = mapNetlifyRow(parseCsv(CSV)[0]);
    expect(row).toMatchObject({
      name: "Rao, Asha", phone: "+919876543210", age: 29, target_month: "2027-02-01", level: "Consistent",
      sessions_per_week: "3-4", easy_pace_sec: 412, weekly_km: 22, devices: ["Garmin", "Strava"], days: ["Tue", "Sat"],
      times: ["early_morning", "evening"], source: "netlify-forms", cohort_label: "Half Marathon · Gachibowli",
      created_at: "2026-10-20T01:15:00.000Z",
    });
  });

  it("reports rows it can't import", () => {
    expect(mapNetlifyRow(parseCsv(CSV)[1]).error).toMatch(/bad phone/);
  });

  it("produces rows the database accepts", async () => {
    const db = await createLocalDb();
    const { row } = mapNetlifyRow(parseCsv(CSV)[0]);
    const { cohort_label: _l, ...v } = row!;
    void _l;
    const cols = Object.keys(v);
    await db.query(
      `insert into applications (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
      Object.values(v),
    );
    const r = await db.query<{ n: number }>("select count(*)::int n from applications where source = 'netlify-forms'");
    expect(r.rows[0].n).toBe(1);
  });
});
