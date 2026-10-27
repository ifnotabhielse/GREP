import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, signInAsAdmin, sql } from "./helpers";

async function seedApplicant(name: string, phone: string, extra: Partial<Record<string, unknown>> = {}) {
  const [c] = await sql()<{ id: string }[]>`select id::text from cohorts where slug = 'first-10k'`;
  await sql()`delete from applications where phone = ${phone}`;
  await sql()`
    insert into applications (name, email, phone, age, city, area, activity, target, level, sessions_per_week,
      easy_pace_sec, days, times, consent_at, consent_version, requested_cohort_id)
    values (${name}, ${name.toLowerCase().replace(/\s/g, ".") + "@example.com"}, ${phone}, 31, 'Hyderabad',
      ${(extra.area as string) ?? "Jubilee Hills"}, 'Running', 'Run 10K without stopping', 'Starting out', '1-2',
      ${(extra.pace as number) ?? 480}, ${["Mon", "Wed"]}, ${["early_morning"]}, now(), 'test', ${c.id}::uuid)`;
}

test("admin pages require an admin", async ({ page, context }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  // Signed in, but not on the admin list.
  await context.addCookies([{ name: "e2e-admin", value: "stranger@example.com", url: "http://127.0.0.1:3100" }]);
  await page.goto("/admin/cohorts");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const csv = await page.request.get("/admin/export", { maxRedirects: 0 });
  expect(csv.status()).toBe(307);
});

test("login asks for an emailed code and never reveals who is an admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill("#admin-email", "nobody@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.locator(".admin-notice")).toContainText("If that email is on the admin list");
  // The email is kept in a cookie for the code step, not in the URL.
  await expect(page).toHaveURL(/\/admin\/login\?sent=1$/);
  await expect(page.getByLabel("Code sent to nobody@example.com")).toBeVisible();
  await page.fill("#admin-code", "123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".admin-notice")).toHaveText("That code didn't work. Check it, or ask for a new one.");
  await page.getByRole("button", { name: /Use a different email/ }).click();
  await expect(page.locator("#admin-email")).toBeVisible();
});

test("place an applicant, filter, and export CSV", async ({ page }, info) => {
  const phone = info.project.name === "phone" ? "+919811100001" : "+919811100002";
  const name = info.project.name === "phone" ? "Ravi Phone" : "Ravi Desktop";
  await seedApplicant(name, phone);
  await signInAsAdmin(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Applicants" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Filter by pace band and area.
  await page.fill('input[name="paceMin"]', "7:30");
  await page.fill('input[name="paceMax"]', "8:30");
  await page.fill('input[name="area"]', "jubilee");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page).toHaveURL(/paceMin=7%3A30/);
  const row = page.locator("tr", { hasText: name });
  await expect(row).toBeVisible();
  await expect(row).toContainText("8:00 /km");
  await expect(row.locator(".status")).toHaveText("New");

  // The requested cohort is pre-selected; place them.
  await expect(row.locator('select[name="cohort_id"] option:checked')).toHaveText("First 10K");
  await row.getByRole("button", { name: "Place" }).click();
  await expect(page.locator("tr", { hasText: name }).locator(".status")).toHaveText("Placed");
  const [saved] = await sql()<{ status: string; slug: string }[]>`
    select a.status::text, c.slug from applications a join cohorts c on c.id = a.cohort_id where a.phone = ${phone}`;
  expect(saved).toEqual({ status: "placed", slug: "first-10k" });

  // Status filter.
  await page.goto("/admin?status=placed");
  await expect(page.locator("tr", { hasText: name })).toBeVisible();
  await page.goto("/admin?status=waitlist");
  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);

  // CSV export of the current filter.
  const res = await page.request.get(`/admin/export?cohort=first-10k`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body.split("\r\n")[0]).toContain("applied_at,status,placed_cohort,requested_cohort,name");
  expect(body).toContain(`placed,first-10k,first-10k,${name}`);

  // Waitlist and undo.
  await page.goto(`/admin?q=${encodeURIComponent(name)}`);
  await page.locator("tr", { hasText: name }).getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("tr", { hasText: name }).locator(".status")).toHaveText("New");
  await page.locator("tr", { hasText: name }).getByRole("button", { name: "Waitlist" }).click();
  await expect(page.locator("tr", { hasText: name }).locator(".status")).toHaveText("Waitlist");
});

test("a cohort added in admin shows on the site straight away", async ({ page }, info) => {
  const slug = `night-runners-${info.project.name}`;
  await sql()`delete from cohorts where slug = ${slug}`;
  await signInAsAdmin(page);
  await page.goto("/admin/cohorts");
  await expectNoHorizontalScroll(page);
  await page.getByRole("link", { name: "New cohort" }).click();
  await expect(page.getByRole("heading", { name: "New cohort" })).toBeVisible();

  await page.fill('input[name="name"]', `Night Runners ${info.project.name}`);
  await page.fill('input[name="slug"]', slug);
  await page.selectOption('select[name="kind"]', "goal");
  await page.fill('input[name="weeks"]', "6");
  await page.fill('input[name="subtitle"]', "Easy evening miles");
  await page.fill('input[name="area"]', "Madhapur");
  await page.fill('textarea[name="sessions"]', "Tue and Thu, 8:00 PM");
  await page.fill('input[name="starts_on"]', "2026-12-07");
  await page.fill('input[name="pace_min"]', "6:00");
  await page.fill('input[name="pace_max"]', "5:30");
  await page.fill('input[name="whatsapp_link"]', "https://chat.whatsapp.com/TESTLINK");
  await page.check('input[name="published"]');
  await page.getByRole("button", { name: "Save cohort" }).click();
  await expect(page.locator(".submit-err")).toHaveText("The slower pace must be the larger number.");
  await page.fill('input[name="pace_max"]', "6:45");
  await page.getByRole("button", { name: "Save cohort" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/cohorts\\?saved=${slug}$`));
  await expect(page.locator(`tr[data-slug="${slug}"]`)).toContainText("Set");

  // Live on the home page and at its own link, with no deploy.
  await page.goto("/");
  const card = page.locator(`article.cohort[data-slug="${slug}"]`);
  await expect(card).toBeVisible();
  await expect(card).toContainText("6:00–6:45 /km");
  await expect(card).toContainText("Mon, 7 Dec 2026");
  await expect(card).toContainText("Tue and Thu, 8:00 PM");
  await page.goto(`/c/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Night Runners ${info.project.name}`);
  // The WhatsApp link stays private.
  await expect(page.locator("body")).not.toContainText("TESTLINK");

  // Edit: unpublish, and it disappears.
  await page.goto("/admin/cohorts");
  await page.locator(`tr[data-slug="${slug}"]`).getByRole("link", { name: "Edit" }).click();
  await page.uncheck('input[name="published"]');
  await page.getByRole("button", { name: "Save cohort" }).click();
  await expect(page).toHaveURL(/saved=/);
  await page.goto("/");
  await expect(page.locator(`article.cohort[data-slug="${slug}"]`)).toHaveCount(0);
});
