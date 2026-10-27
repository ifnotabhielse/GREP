-- GREP Phase 1 schema.
-- Run once in Supabase → SQL Editor (or `supabase db push`).
--
-- Access model:
--   * The website's server code connects with the database password (DATABASE_URL)
--     and does all reads and writes itself, after its own checks.
--   * Row-level security is ON for every table. The only rule open to the public
--     (publishable) key is: read cohorts that are published. Everything else is
--     closed to the public key, so a leaked publishable key exposes nothing private.

create extension if not exists citext;

-- ---------- Types ----------
create type public.cohort_kind        as enum ('race', 'goal');
create type public.cohort_status      as enum ('forming', 'waitlist', 'active', 'done');
create type public.application_status as enum ('applied', 'placed', 'waitlist', 'declined');

-- ---------- Admins (allowlist for /admin) ----------
create table public.admins (
  email    citext primary key,
  added_at timestamptz not null default now()
);

-- ---------- Cohorts ----------
create table public.cohorts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind            public.cohort_kind not null,
  name            text not null check (char_length(name) between 2 and 80),
  subtitle        text,                 -- goal cohorts: "Race in Feb 2027"
  activity        text not null default 'Running',
  race_city       text,                 -- race cohorts: "Mumbai"
  race_date       date,
  race_date_label text,                 -- used when race_date is unknown: "Oct 2027, date to be announced"
  distances       text[] not null default '{}',
  training        text,                 -- "Pace pods of 3 to 6, matched on easy pace"
  weeks           int check (weeks between 1 and 52),
  area            text,
  meeting_point   text,
  maps_url        text check (maps_url is null or maps_url ~ '^https://'),
  sessions        text[] not null default '{}',
  starts_on       date,
  starts_label    text,                 -- used when starts_on is unknown: "July 2027"
  status          public.cohort_status not null default 'forming',
  pace_min_sec    int check (pace_min_sec between 180 and 720),
  pace_max_sec    int check (pace_max_sec between 180 and 720),
  pace_note       text,                 -- "heart rate in Zone 2"
  join_label      text,                 -- shown in the form: "Half Marathon · Gachibowli"
  join_target     text,                 -- pre-fills "Next target"
  target_month    date check (target_month is null or extract(day from target_month) = 1),
  lead_id         uuid,                 -- references profiles in Phase 2
  published       boolean not null default false,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint pace_band_order check (pace_min_sec is null or pace_max_sec is null or pace_max_sec >= pace_min_sec)
);

-- Private cohort details. Kept out of `cohorts` because that table is public
-- and row-level security works per row, not per column.
create table public.cohort_secrets (
  cohort_id     uuid primary key references public.cohorts(id) on delete cascade,
  whatsapp_link text check (whatsapp_link is null or whatsapp_link ~ '^https://chat\.whatsapp\.com/')
);

-- ---------- Applications ----------
create table public.applications (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid,                                   -- linked to a login in Phase 2
  requested_cohort_id uuid references public.cohorts(id) on delete set null,
  cohort_id           uuid references public.cohorts(id) on delete set null,  -- placed into
  name                text not null check (char_length(name) between 2 and 80),
  email               citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone               text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  age                 int check (age between 18 and 80),
  city                text not null check (char_length(city) between 2 and 60),
  area                text not null check (char_length(area) between 2 and 80),
  activity            text not null,
  target              text not null check (char_length(target) between 3 and 140),
  target_month        date check (target_month is null or extract(day from target_month) = 1),
  level               text check (level in ('Starting out', 'Consistent', 'Competitive')),
  sessions_per_week   text check (sessions_per_week in ('1-2', '3-4', '5+')),
  easy_pace_sec       int check (easy_pace_sec between 180 and 720),
  weekly_km           numeric(6,1) check (weekly_km between 0 and 1000),
  recent_best         text check (char_length(recent_best) <= 80),
  devices             text[] not null default '{}',
  days                text[] not null default '{}'
                      check (days <@ array['Mon','Tue','Wed','Thu','Fri','Sat','Sun']),
  times               text[] not null default '{}'
                      check (times <@ array['early_morning','morning','evening','late_evening']),
  consent_at          timestamptz not null,
  consent_version     text not null,
  status              public.application_status not null default 'applied',
  admin_note          text,
  source              text not null default 'web' check (source in ('web', 'netlify-forms', 'admin')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- New web sign-ups must include an email and an age; imported Netlify rows may not.
  constraint web_requires_email_age check (source <> 'web' or (email is not null and age is not null))
);
create index applications_status_created_idx on public.applications (status, created_at desc);
create index applications_phone_idx on public.applications (phone);
create index applications_cohort_idx on public.applications (cohort_id);

-- ---------- Rate limiting (written by the server only) ----------
create table public.submit_attempts (
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index submit_attempts_ip_created_idx on public.submit_attempts (ip_hash, created_at);

-- ---------- updated_at ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;
create trigger cohorts_touch      before update on public.cohorts      for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

-- ---------- Row-level security ----------
alter table public.admins          enable row level security;
alter table public.cohorts         enable row level security;
alter table public.cohort_secrets  enable row level security;
alter table public.applications    enable row level security;
alter table public.submit_attempts enable row level security;

-- The one public rule. No other table has a policy, so the public key reads nothing else.
create policy cohorts_public_read on public.cohorts
  for select to anon, authenticated
  using (published);
