-- Trail Conditions — crowd report backend schema.
--
-- Run this once against your Supabase project (SQL Editor, or `supabase db
-- push`). It creates the single table the app reads/writes for user-generated
-- hazard reports, plus row-level security policies that allow anonymous
-- (anon-key) clients to read and submit reports — this app has no auth, so the
-- browser talks to Supabase with the public anon key only.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  waypoint_id text not null,
  type text not null check (
    type in (
      'flooding', 'rockfall', 'ice', 'trail-blocked',
      'wildlife', 'high-wind', 'lightning', 'other'
    )
  ),
  severity text not null check (severity in ('low', 'medium', 'high')),
  note text,
  created_at timestamptz not null default now()
);

-- The app only ever queries recent reports by time, newest first.
create index if not exists reports_created_at_idx
  on public.reports (created_at desc);

alter table public.reports enable row level security;

-- Anyone (anon key) may read reports — they're public trail conditions.
drop policy if exists "reports are readable by everyone" on public.reports;
create policy "reports are readable by everyone"
  on public.reports for select
  using (true);

-- Anyone (anon key) may submit a report. The CHECK constraints above are the
-- guardrail against garbage values; there's no per-user ownership because the
-- app is unauthenticated. Tighten this (auth, rate limiting, moderation) before
-- treating it as a real multi-user crowd-sourcing system.
drop policy if exists "reports are insertable by everyone" on public.reports;
create policy "reports are insertable by everyone"
  on public.reports for insert
  with check (true);
