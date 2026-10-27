import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, sql } from "./helpers";

test("home page lists the published cohorts from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find your6 AM people.");
  const slugs = await page.locator("article.cohort").evaluateAll((els) => els.map((e) => e.getAttribute("data-slug")));
  expect(slugs).toEqual([
    "tata-mumbai-2027", "tcs-world-10k-2027", "delhi-half-2027", "ironman-703-goa-2027",
    "half-marathon-feb-2027", "first-10k", "zone-2-base",
  ]);
  const mumbai = page.locator('article.cohort[data-slug="tata-mumbai-2027"]');
  await expect(mumbai).toContainText("Mumbai · Sun, 17 Jan 2027");
  await expect(mumbai).toContainText("Starts");
  await expect(mumbai).toContainText("Mon, 2 Nov 2026");
  await expect(mumbai.locator(".pill")).toHaveText("Forming");
  const zone2 = page.locator('article.cohort[data-slug="zone-2-base"]');
  await expect(zone2).toContainText("7:00–8:00 /km, heart rate in Zone 2");
  await expect(zone2.locator(".mini-band")).toHaveAttribute("style", /left:\s*42\.86%;\s*width:\s*28\.57%/);
  await expect(page.locator('article.cohort[data-slug="tcs-world-10k-2027"]').getByRole("button")).toHaveText("Join the waitlist");
  await expectNoHorizontalScroll(page);
});

for (const path of ["/", "/c/tata-mumbai-2027", "/c/zone-2-base", "/privacy", "/terms", "/admin/login"]) {
  test(`no sideways scroll on ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expectNoHorizontalScroll(page);
  });
}

test("cohort page shows its details and link-preview tags", async ({ page, request }) => {
  await page.goto("/c/tata-mumbai-2027");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tata Mumbai Marathon");
  await expect(page.locator("main")).toContainText("Tue and Thu, 5:45 AM");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Tata Mumbai Marathon cohort · GREP");
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /Sun, 17 Jan 2027/);
  const img = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(img).toContain("/c/tata-mumbai-2027/opengraph-image");
  const res = await request.get(new URL(img!).pathname + new URL(img!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("unpublished and unknown cohorts are not shown", async ({ page }) => {
  await sql()`insert into cohorts (slug, kind, name, published) values ('secret-draft', 'goal', 'Secret draft', false) on conflict (slug) do nothing`;
  await page.goto("/c/secret-draft");
  await expect(page.locator("body")).toContainText("could not be found");
  await page.goto("/c/does-not-exist");
  await expect(page.locator("body")).toContainText("could not be found");
});

test("privacy and terms are linked from the footer and the consent box", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  await expect(page.locator("footer").getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  // The consent box is on step 4 of the form, so it's in the page but hidden until then.
  await expect(page.locator('.consent a[href="/privacy"]')).toHaveText("privacy policy");
  await expect(page.locator('.consent a[href="/terms"]')).toHaveText("terms");
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
});
