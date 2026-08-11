-- Migration: event_leads — unified launch leads + RSVP workflow
-- Replaces scattered launch lead lists (CSVs, invite docs) with one table.
-- Safe: creates a new table only; does not touch applicants, revenue_ops, or Notion sync.
-- Rollback: supabase/rollback/20260811000000_event_leads_rollback.sql
--
-- Decisions:
-- - event_id is a nullable UUID with NO foreign key. The workshops table is a
--   different domain (workshop pipeline vs. launch events); coupling them would
--   confuse both models. A future events table can own this relationship.
-- - No updated_at trigger: the project's documented new-table convention
--   (SOP.md §3.3) does not use one. The app stamps updated_at on writes.

create table if not exists public.event_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  event_id uuid,
  invited_by text,          -- team handle, e.g. 'monny', 'sunshine', 'bingle', 'omar', 'pia'
  rsvp_status text not null default 'invited'
    check (rsvp_status in ('invited', 'interested', 'confirmed', 'attended', 'declined', 'no_response')),
  rsvp_at timestamptz,
  source text,              -- e.g. 'hard-launch', 'podcast-launch', 'referral', 'instagram'
  survey_data jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: the internal dashboard connects with the publishable (anon) key and
-- gates access in-app by profile, matching the existing tables (tasks,
-- workshops, applicants, ...). Both anon and authenticated roles need access.
alter table public.event_leads enable row level security;

drop policy if exists "event_leads_dashboard_all" on public.event_leads;
create policy "event_leads_dashboard_all" on public.event_leads
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime publication for postgres_changes subscriptions.
alter publication supabase_realtime add table public.event_leads;
