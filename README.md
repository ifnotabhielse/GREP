# GREP

Small training groups ("cohorts") of 3 to 6 people at the same pace, toward the same goal, on the same schedule. Hyderabad first.

Next.js 16 (App Router) · Supabase Postgres + Auth · Netlify · Playwright.

## Run it locally

```bash
npm install
cp .env.example .env.local     # the defaults point at the local database below
npm run db                     # local Postgres (PGlite) on :54329, migrated and seeded
npm run dev                    # http://localhost:3000
```

To open `/admin` locally, start the database with your email on the admin list and turn on the test sign-in:

```bash
LOCAL_DB_ADMIN=you@example.com npm run db
E2E_AUTH_BYPASS=1 npm run dev  # then set a cookie e2e-admin=you@example.com in the browser
```

## Tests

```bash
npm test          # unit + schema/row-level-security tests (no server needed)
npm run e2e       # builds the app and runs Playwright at 390px and 1440px
npm run typecheck && npm run lint
```

The e2e suite starts its own database on :54330 and the app on :3100.

## How it fits together

| Path | What |
|---|---|
| `legacy/` | The original static site. Design source of truth; `app/globals.css` starts with its CSS, copied verbatim. |
| `app/page.tsx` | Home page. Cohort cards come from the `cohorts` table (cached; refreshed every 5 minutes or instantly after an admin edit). |
| `components/join-form.tsx` | The 4-step form. Rules live in `lib/application.ts` and run in the browser and again on the server. |
| `app/actions.ts` | Saves an application: honeypot → rate limit (5 per hour per IP) → validation → save → emails. |
| `app/c/[slug]` | A shareable page per cohort, with a WhatsApp/OG preview image. |
| `app/admin` | Magic-link sign-in for emails in `admins`; applicants, filters, place/waitlist/decline, CSV export, cohort editor. |
| `supabase/migrations` | Schema. Row-level security: the public key can read published cohorts and nothing else. |
| `netlify/functions/keepalive.mts` | Daily: keeps the free Supabase project awake and clears old rate-limit rows. |
| `scripts/import-netlify-forms.ts` | Moves old Netlify Forms sign-ups into `applications`. |

The server reaches Postgres directly (`DATABASE_URL`, Supabase's transaction pooler). Supabase's JS client is used only for admin sign-in.

## Set up production (one time)

### 1. Supabase (`grep-prod`, region Mumbai `ap-south-1`)

1. **SQL Editor:** run `supabase/migrations/20261027000001_init.sql`, then `supabase/seed.sql`.
2. Add yourself as an admin:
   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```
3. **Authentication → URL Configuration:** Site URL = your site (e.g. `https://samepace.netlify.app`). Add `https://<your-site>/auth/callback` to Redirect URLs.
4. **Connect → Transaction pooler:** copy the connection string (port 6543) and put your database password in it. This is `DATABASE_URL`.
5. **Project Settings → API Keys:** copy the publishable key (`sb_publishable_…`).

### 2. Netlify

1. **Site configuration → Build & deploy → Link repository** → `ifnotabhielse/GREP`, branch `main`. Build settings come from `netlify.toml`.
2. **Environment variables:**

   | Name | Value | Secret? |
   |---|---|---|
   | `DATABASE_URL` | Supabase transaction pooler string | **Yes** |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` | No |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | No |
   | `IP_HASH_SALT` | any long random string | **Yes** |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-site>` | No |
   | `ADMIN_ALERT_EMAIL` | where new-application alerts go | No |
   | `RESEND_API_KEY` | from Resend | **Yes** |
   | `EMAIL_FROM` | `GREP <hello@your-domain>` once the domain is verified in Resend | No |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | contact shown on /privacy and /terms | No |

   Never set `E2E_AUTH_BYPASS` on Netlify. (The code refuses it there anyway.)
3. Deploy. Then open `/admin/login`, enter your email, and click the link in the email.

### 3. Old Netlify Forms sign-ups

Netlify → Forms → `grep-signup` → Download CSV, then:

```bash
DATABASE_URL="<pooler string>" npx tsx scripts/import-netlify-forms.ts grep-signup.csv --dry-run
DATABASE_URL="<pooler string>" npx tsx scripts/import-netlify-forms.ts grep-signup.csv
```

Imported rows have no email (the old form didn't ask for one).
