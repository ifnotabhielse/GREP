-- The seven cohorts shown on the static page on 27 Oct 2026, copied as they are.
-- ⚠️ Areas, session times and start dates are PLACEHOLDERS. Replace them in /admin
-- (or here) before launch. Race dates: Mumbai confirmed, TCS World 10K blog-sourced,
-- Delhi 2027 and IRONMAN Goa 2027 not yet announced.

insert into public.cohorts
  (slug, kind, name, subtitle, activity, race_city, race_date, race_date_label, distances, training,
   weeks, area, sessions, starts_on, starts_label, status, pace_min_sec, pace_max_sec, pace_note,
   join_label, join_target, target_month, published, sort_order)
values
  ('tata-mumbai-2027', 'race', 'Tata Mumbai Marathon', null, 'Running', 'Mumbai', '2027-01-17', null,
   array['Full · 42.2 km', 'Half · 21.1 km'], 'Pace pods of 3 to 6, matched on easy pace',
   11, 'Gachibowli and Financial District', array['Tue and Thu, 5:45 AM', 'Sun long run, 5:00 AM'],
   '2026-11-02', null, 'forming', null, null, null,
   'Tata Mumbai Marathon 2027', 'Tata Mumbai Marathon, 17 Jan 2027', '2027-01-01', true, 10),

  ('tcs-world-10k-2027', 'race', 'TCS World 10K', null, 'Running', 'Bengaluru', '2027-04-25', null,
   array['10 km'], 'Speed work and tempo runs, pods by 10K time',
   10, 'Kondapur and Madhapur', array['Mon and Wed, 6:00 AM', 'Sat tempo run, 6:00 AM'],
   '2027-02-15', null, 'waitlist', null, null, null,
   'TCS World 10K 2027', 'TCS World 10K Bengaluru, 25 Apr 2027', '2027-04-01', true, 20),

  ('delhi-half-2027', 'race', 'Vedanta Delhi Half Marathon', null, 'Running', 'New Delhi', null, 'Oct 2027, date to be announced',
   array['Half · 21.1 km'], 'Pace pods of 3 to 6, matched on easy pace',
   12, 'Gachibowli and Financial District', array['Tue and Thu, 6:00 AM', 'Sat long run, 5:30 AM'],
   null, 'July 2027', 'waitlist', null, null, null,
   'Vedanta Delhi Half Marathon 2027', 'Vedanta Delhi Half Marathon, Oct 2027', '2027-10-01', true, 30),

  ('ironman-703-goa-2027', 'race', 'IRONMAN 70.3 Goa', null, 'Triathlon', 'Panaji', null, 'Late Oct 2027',
   array['Swim 1.9 km', 'Bike 90 km', 'Run 21.1 km'], 'Swim, bike and run blocks, pods by bike and run pace',
   26, 'Gachibowli for swim and run, Gandipet loop for rides', array['Swim Tue and run Thu, 6:00 AM', 'Sun long ride, 5:30 AM'],
   null, 'April 2027', 'waitlist', null, null, null,
   'IRONMAN 70.3 Goa 2027', 'IRONMAN 70.3 Goa, Oct 2027', '2027-10-01', true, 40),

  ('half-marathon-feb-2027', 'goal', 'Half Marathon', 'Race in Feb 2027', 'Running', null, null, null,
   '{}', null,
   12, 'Gachibowli and Financial District', array['Tue and Thu, 6:00 AM', 'Sat long run, 5:30 AM'],
   '2026-11-16', null, 'forming', 390, 435, null,
   'Half Marathon · Gachibowli', 'Half marathon in Feb 2027', '2027-02-01', true, 50),

  ('first-10k', 'goal', 'First 10K', 'Run 10K without stopping', 'Running', null, null, null,
   '{}', null,
   8, 'Jubilee Hills, KBR Park', array['Mon and Wed, 6:30 AM', 'Sun, 6:00 AM'],
   '2026-11-23', null, 'forming', 450, 510, null,
   'First 10K · Jubilee Hills', 'Run 10K without stopping', null, true, 60),

  ('zone-2-base', 'goal', 'Zone 2 Base', 'Build an aerobic base', 'Running', null, null, null,
   '{}', null,
   10, 'Necklace Road', array['Wed and Sat, 6:00 AM'],
   '2026-12-02', null, 'forming', 420, 480, 'heart rate in Zone 2',
   'Zone 2 Base · Necklace Road', 'Build an aerobic base in Zone 2', null, true, 70)
on conflict (slug) do nothing;
