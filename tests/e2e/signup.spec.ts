import { expect, test, type Page } from "@playwright/test";
import { clearOutbox, expectNoHorizontalScroll, ipHash, outbox, sql, uniquePhone, useIp } from "./helpers";

const chip = (page: Page, group: string, name: string | RegExp) => page.locator(`#g-${group}`).getByRole("button", { name });

async function fillStep1(page: Page, o: { name: string; age?: string; email: string; phone: string }) {
  await page.fill("#f-name", o.name);
  await page.fill("#f-age", o.age ?? "29");
  await page.fill("#f-area", "Gachibowli");
  await page.fill("#f-phone", o.phone);
  await page.fill("#f-email", o.email);
}

test.describe("join form", () => {
  test("sign up end to end from a cohort card", async ({ page }, info) => {
    const ip = `10.0.1.${info.project.name === "phone" ? 1 : 2}`;
    await useIp(page, ip);
    clearOutbox();
    const phone = uniquePhone(Date.now() + (info.project.name === "phone" ? 1 : 2));
    const email = `asha.${info.project.name}@example.com`;

    await page.goto("/");
    await expectNoHorizontalScroll(page);

    // Pick the Half Marathon goal cohort from its card.
    const card = page.locator('article.cohort[data-slug="half-marathon-feb-2027"]');
    await card.getByRole("button", { name: "Join this cohort" }).click();
    await expect(page.locator("#joining")).toBeVisible();
    await expect(page.locator("#joining-name")).toHaveText("Half Marathon · Gachibowli");

    // Step 1: errors first, then valid details.
    await page.getByRole("button", { name: "Continue" }).first().click();
    await expect(page.locator("#err-f-name")).toHaveText("Enter your name.");
    await expect(page.locator("#err-f-email")).toHaveText("Enter your email so we can send your confirmation.");
    await expect(page.locator("#f-name")).toHaveAttribute("aria-invalid", "true");
    await fillStep1(page, { name: "Asha Rao", age: "17", email, phone: "12345" });
    await page.locator('[data-panel="0"] [data-next]').click();
    await expect(page.locator("#err-f-age")).toHaveText("Enter an age from 18 to 80. Cohorts are for adults.");
    await expect(page.locator("#err-f-phone")).toHaveText("Enter a 10-digit Indian mobile number.");
    await page.fill("#f-age", "29");
    await page.fill("#f-phone", phone);
    await page.locator('[data-panel="0"] [data-next]').click();

    // Step 2: pre-filled from the cohort.
    await expect(page.locator("#progress-text")).toHaveText("Step 2 of 4 · Your goal");
    await expect(chip(page, "activity", "Running")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#f-target")).toHaveValue("Half marathon in Feb 2027");
    await expect(page.locator("#f-month")).toHaveValue("2027-02");
    await page.locator('[data-panel="1"] [data-next]').click();

    // Step 3
    await page.locator('[data-panel="2"] [data-next]').click();
    await expect(page.locator("#err-level")).toHaveText("Pick the level closest to you.");
    await chip(page, "level", /Consistent/).click();
    await chip(page, "sessions", "3–4").click();
    await page.fill("#f-pace", "2:30");
    await page.locator('[data-panel="2"] [data-next]').click();
    await expect(page.locator("#err-f-pace")).toHaveText("Use minutes and seconds per km, like 6:45.");
    await page.fill("#f-pace", "6.52");
    await page.fill("#f-distance", "22");
    await page.fill("#f-best", "10K in 58:30");
    await chip(page, "devices", "Strava").click();
    await chip(page, "devices", "Garmin").click();
    await page.locator('[data-panel="2"] [data-next]').click();

    // Step 4
    await chip(page, "days", "Tue").click();
    await chip(page, "days", "Sat").click();
    await chip(page, "times", /Early morning/).click();
    await page.locator('[data-panel="3"] [data-next]').click();
    await expect(page.locator("#err-f-consent")).toHaveText("Tick this box to continue.");
    await page.check("#f-consent");
    await page.locator('[data-panel="3"] [data-next]').click();

    // Review
    await expect(page.locator("#progress-text")).toHaveText("Review");
    const review = page.locator("#review");
    await expect(review).toContainText("Asha Rao");
    await expect(review).toContainText(email);
    await expect(review).toContainText(`+91 ${phone}`);
    await expect(review).toContainText("February 2027");
    await expect(review).toContainText("6:52 /km");
    await expect(review).toContainText("Garmin, Strava");
    await expect(review).toContainText("Tue, Sat");
    await expectNoHorizontalScroll(page);

    // Edit jumps back to a step.
    await review.getByRole("button", { name: "Edit your goal" }).click();
    await expect(page.locator("#progress-text")).toHaveText("Step 2 of 4 · Your goal");
    for (let i = 1; i <= 3; i++) await page.locator(`[data-panel="${i}"] [data-next]`).click();

    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.locator("#done-title")).toHaveText("You're in, Asha.");
    await expect(page.locator("#done-sub")).toHaveText(`We'll message you on WhatsApp at +91 ${phone} once we have your match.`);
    await expect(page.locator(".progress-wrap")).toBeHidden();

    // Saved correctly.
    const rows = await sql()`
      select a.name, a.email::text, a.phone, a.age, a.city, a.area, a.activity, a.target, a.target_month::text, a.level,
             a.sessions_per_week, a.easy_pace_sec, a.weekly_km::text, a.recent_best, a.devices, a.days, a.times,
             a.status::text, a.source, a.consent_version, c.slug as requested
      from applications a left join cohorts c on c.id = a.requested_cohort_id
      where a.phone = ${"+91" + phone}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Asha Rao", email, age: 29, city: "Hyderabad", area: "Gachibowli", activity: "Running",
      target: "Half marathon in Feb 2027", target_month: "2027-02-01", level: "Consistent", sessions_per_week: "3-4",
      easy_pace_sec: 412, weekly_km: "22.0", recent_best: "10K in 58:30", devices: ["Garmin", "Strava"],
      days: ["Tue", "Sat"], times: ["early_morning"], status: "applied", source: "web", requested: "half-marathon-feb-2027",
    });

    // Confirmation to the applicant and an alert to the admin.
    await expect.poll(() => outbox().length).toBe(2);
    const mails = outbox();
    const conf = mails.find((m) => m.to === email)!;
    expect(conf.subject).toContain("You're in");
    expect(conf.text).toContain(`+91 ${phone}`);
    expect(conf.text).toContain("Half Marathon");
    const alert = mails.find((m) => m.to === "alerts@grep.test")!;
    expect(alert.subject).toBe("New GREP application: Asha Rao · Half Marathon");

    // The draft was cleared.
    expect(await page.evaluate(() => localStorage.getItem("grep-draft-v2"))).toBeNull();
  });

  test("keeps a draft in this browser", async ({ page }) => {
    await page.goto("/#join");
    await page.fill("#f-name", "Draft Person");
    await page.fill("#f-area", "Kondapur");
    await page.reload();
    await expect(page.locator("#f-name")).toHaveValue("Draft Person");
    await expect(page.locator("#f-area")).toHaveValue("Kondapur");
  });

  test("a cohort page's join button pre-selects that cohort", async ({ page }) => {
    await page.goto("/c/tata-mumbai-2027");
    await page.getByRole("link", { name: "Join this cohort" }).click();
    await expect(page).toHaveURL(/\/\?cohort=tata-mumbai-2027#join$/);
    await expect(page.locator("#joining-name")).toHaveText("Tata Mumbai Marathon 2027");
  });

  test("bots that fill the hidden field get no row", async ({ page }, info) => {
    await useIp(page, `10.0.2.${info.project.name === "phone" ? 1 : 2}`);
    const phone = uniquePhone(Date.now() + 77 + (info.project.name === "phone" ? 0 : 1));
    await page.goto("/#join");
    await fillStep1(page, { name: "Bot Bot", email: "bot@example.com", phone });
    await page.evaluate(() => {
      (document.getElementById("f-bot") as HTMLInputElement).value = "http://spam.example";
    });
    await page.locator('[data-panel="0"] [data-next]').click();
    await chip(page, "activity", "Cycling").click();
    await page.fill("#f-target", "100 km ride");
    await page.locator('[data-panel="1"] [data-next]').click();
    await chip(page, "level", /Starting out/).click();
    await chip(page, "sessions", "1–2").click();
    await page.locator('[data-panel="2"] [data-next]').click();
    await chip(page, "days", "Sun").click();
    await chip(page, "times", /Morning · 7–9 AM/).click();
    await page.check("#f-consent");
    await page.locator('[data-panel="3"] [data-next]').click();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.locator("#done-title")).toHaveText("You're in, Bot.");
    const rows = await sql()`select 1 from applications where phone = ${"+91" + phone}`;
    expect(rows).toHaveLength(0);
  });

  test("rate limit: the 6th sign-up in an hour from one connection is refused", async ({ page }, info) => {
    const ip = `10.0.3.${info.project.name === "phone" ? 1 : 2}`;
    await useIp(page, ip);
    for (let i = 0; i < 5; i++) await sql()`insert into submit_attempts (ip_hash) values (${ipHash(ip)})`;
    const phone = uniquePhone(Date.now() + 500 + (info.project.name === "phone" ? 0 : 1));
    await page.goto("/#join");
    await fillStep1(page, { name: "Limit Test", email: "limit@example.com", phone });
    await page.locator('[data-panel="0"] [data-next]').click();
    await chip(page, "activity", "HYROX").click();
    await page.fill("#f-target", "First HYROX race");
    await page.locator('[data-panel="1"] [data-next]').click();
    await chip(page, "level", /Competitive/).click();
    await chip(page, "sessions", "5+").click();
    await page.locator('[data-panel="2"] [data-next]').click();
    await chip(page, "days", "Mon").click();
    await chip(page, "times", /Evening · 6–8 PM/).click();
    await page.check("#f-consent");
    await page.locator('[data-panel="3"] [data-next]').click();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.locator("#err-submit")).toHaveText("Too many applications from this connection. Try again in an hour.");
    expect(await sql()`select 1 from applications where phone = ${"+91" + phone}`).toHaveLength(0);
  });
});
