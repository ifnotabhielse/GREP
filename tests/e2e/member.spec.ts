import { expect, test, type Page } from "@playwright/test";
import { clearOutbox, expectNoHorizontalScroll, outbox, signInAsAdmin, sql } from "./helpers";

/** Signed in as any email (the test-only sign-in shortcut works for members too). */
const signInAs = (page: Page, email: string) => signInAsAdmin(page, email);

async function seedPerson(name: string, email: string, phone: string, cohortSlug: string | null, status = "applied") {
  await sql()`delete from applications where phone = ${phone} or email = ${email}`;
  const [c] = cohortSlug ? await sql()<{ id: string }[]>`select id::text from cohorts where slug = ${cohortSlug}` : [undefined];
  await sql()`
    insert into applications (name, email, phone, age, city, area, activity, target, consent_at, consent_version, status, cohort_id, requested_cohort_id)
    values (${name}, ${email}, ${phone}, 30, 'Hyderabad', 'Jubilee Hills', 'Running', 'Run 10K without stopping', now(), 'test',
            ${status}::application_status, ${status === "placed" && c ? c.id : null}::uuid, ${c ? c.id : null}::uuid)`;
}

test.describe("members", () => {
  test("/me needs sign-in, and the sign-in form never reveals who applied", async ({ page }) => {
    await page.goto("/me");
    await expect(page).toHaveURL(/\/login$/);
    await expectNoHorizontalScroll(page);
    await page.fill("#member-email", "nobody-applied@example.com");
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.locator(".admin-notice")).toContainText("If you've applied with that email");
    await page.fill("#member-code", " 1234 5678 ");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator(".admin-notice")).toHaveText("That code didn't work. Check it, or ask for a new one.");
    await expect(page.getByLabel("Code sent to nobody-applied@example.com")).toBeVisible();
  });

  test("an applicant who isn't placed yet sees their status, and no cohort page", async ({ page }, info) => {
    const email = `waiting.${info.project.name}@example.com`;
    await seedPerson("Wendy Waiting", email, info.project.name === "phone" ? "+919822200001" : "+919822200002", "first-10k");
    await signInAs(page, email);
    await page.goto("/me");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("My GREP");
    await expect(page.locator("main")).toContainText("We're finding your match");
    await expect(page.locator("main")).toContainText("You asked for First 10K");
    await expect(page.getByRole("link", { name: "Open my cohort" })).toHaveCount(0);
    await page.goto("/me/cohort");
    await expect(page).toHaveURL(/\/me$/);
    await expectNoHorizontalScroll(page);
  });

  test("placing someone emails them, and they see their cohort with first names and the group link", async ({ page }, info) => {
    const p = info.project.name;
    const email = `paula.${p}@example.com`;
    const phone = p === "phone" ? "+919833300001" : "+919833300002";
    const slug = `members-test-${p}`;
    const paula = `Paula ${p === "phone" ? "Fernandes" : "Dsouza"}`;
    await sql()`delete from applications where cohort_id in (select id from cohorts where slug = ${slug})`;
    await sql()`delete from cohorts where slug = ${slug}`;
    const [c] = await sql()<{ id: string }[]>`
      insert into cohorts (slug, kind, name, subtitle, area, meeting_point, maps_url, sessions, starts_on, weeks, published)
      values (${slug}, 'goal', ${`Members Test ${p}`}, 'Test cohort', 'Jubilee Hills', 'KBR Park, Gate 1', 'https://maps.example.com/kbr',
              ${["Mon and Wed, 6:30 AM"]}, '2026-11-23', 8, false)
      returning id::text`;
    await sql()`insert into cohort_secrets (cohort_id, whatsapp_link) values (${c.id}::uuid, 'https://chat.whatsapp.com/MEMBERS123')`;
    // Two people already in the cohort.
    await seedPerson("Ravi Kumar", `ravi.${p}@example.com`, p === "phone" ? "+919833300011" : "+919833300012", slug, "placed");
    await seedPerson("Sana Iyer", `sana.${p}@example.com`, p === "phone" ? "+919833300021" : "+919833300022", slug, "placed");
    // Paula applied and is waiting.
    await seedPerson(paula, email, phone, null);

    // Admin places Paula.
    clearOutbox();
    await signInAsAdmin(page);
    await page.goto(`/admin?q=${encodeURIComponent(paula)}`);
    const row = page.locator("tr", { hasText: paula });
    await row.locator('select[name="cohort_id"]').selectOption({ label: `Members Test ${p}` });
    await row.getByRole("button", { name: "Place" }).click();
    await expect(page.locator("tr", { hasText: paula }).locator(".status")).toHaveText("Placed");

    // She gets a "You're in" email with a sign-in link.
    await expect.poll(() => outbox().filter((m) => m.to === email).length).toBe(1);
    const mail = outbox().find((m) => m.to === email)!;
    expect(mail.subject).toBe(`You're in: Members Test ${p}`);
    expect(mail.text).toContain("Starts: Mon, 23 Nov 2026");
    expect(mail.text).toContain("/login");
    // Re-placing in the same cohort doesn't email again.
    await page.goto(`/admin?q=${encodeURIComponent(paula)}`);
    await expect(page.locator("tr", { hasText: paula }).getByRole("button", { name: "Place" })).toHaveCount(0);

    // Paula signs in and sees her cohort (even though it's hidden from the public site).
    await signInAs(page, email);
    await page.goto("/me");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You're in.");
    await page.getByRole("link", { name: "Open my cohort" }).click();
    await expect(page).toHaveURL(/\/me\/cohort$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Members Test ${p}`);
    const people = page.getByRole("list", { name: "People in your cohort" });
    await expect(people).toContainText("Ravi");
    await expect(people).toContainText("Sana");
    await expect(people).toContainText("Paula (you)");
    // First names only: no surnames, phones or emails of others.
    const main = page.locator("main");
    await expect(main).not.toContainText("Kumar");
    await expect(main).not.toContainText("Iyer");
    await expect(main).not.toContainText(`ravi.${p}@example.com`);
    await expect(main).not.toContainText("+91983330001");
    await expect(page.getByRole("link", { name: "Join the WhatsApp group" })).toHaveAttribute("href", "https://chat.whatsapp.com/MEMBERS123");
    await expect(page.getByRole("link", { name: /KBR Park, Gate 1/ })).toHaveAttribute("href", "https://maps.example.com/kbr");
    await expect(main).toContainText("Mon and Wed, 6:30 AM");
    await expectNoHorizontalScroll(page);
  });

  test("delete my data removes the applications and signs out", async ({ page }, info) => {
    const email = `delete.${info.project.name}@example.com`;
    await seedPerson("Dev Delete", email, info.project.name === "phone" ? "+919844400001" : "+919844400002", null);
    await signInAs(page, email);
    await page.goto("/me");
    await page.getByText("Delete my data", { exact: true }).first().click();
    await page.getByRole("button", { name: "Delete my data" }).click();
    await expect(page.locator(".member-delete .err")).toHaveText("Tick the box to confirm.");
    expect(await sql()`select 1 from applications where email = ${email}`).toHaveLength(1);
    await page.getByText("Delete my data", { exact: true }).first().click();
    await page.check("#confirm-delete");
    await page.getByRole("button", { name: "Delete my data" }).click();
    await expect(page).toHaveURL(/\/login\?deleted=1$/);
    await expect(page.locator(".admin-notice")).toHaveText("Your details have been deleted.");
    expect(await sql()`select 1 from applications where email = ${email}`).toHaveLength(0);
    await page.goto("/me");
    await expect(page).toHaveURL(/\/login$/);
  });
});
