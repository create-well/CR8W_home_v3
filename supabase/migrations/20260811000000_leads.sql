-- Migration: leads — unified launch leads + RSVP workflow
-- Replaces scattered launch lead lists (CSVs, invite docs) with one table.
-- Safe: creates a new table only; does not touch applicants, revenue_ops, or Notion sync.
-- Rollback: see commented section at the bottom.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  -- Reserved for a future events table. No FK yet: the workshops table is a
  -- different domain (workshops vs. launch events) and coupling them would
  -- confuse the model.
  event_id uuid,
  invited_by text,          -- team handle, e.g. 'monny', 'sunshine', 'bingle', 'omar', 'pia'
  rsvp_status text not null default 'invited'
    check (rsvp_status in ('invited', 'going', 'maybe', 'declined')),
  rsvp_at timestamptz,
  source text,              -- e.g. 'hard-launch', 'podcast-launch', 'referral', 'instagram'
  survey_data jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on every update.
-- NOTE: creates a shared trigger function; if the project later adopts its own
-- set_updated_at(), this create-or-replace keeps the same conventional body.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- RLS: the internal dashboard connects with the publishable (anon) key and
-- gates access in-app by profile, matching the existing tables (tasks,
-- workshops, applicants, ...). Both anon and authenticated roles need access.
alter table public.leads enable row level security;

drop policy if exists "leads_dashboard_all" on public.leads;
create policy "leads_dashboard_all" on public.leads
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime publication for postgres_changes subscriptions.
alter publication supabase_realtime add table public.leads;

-- ── Rollback ────────────────────────────────────────────────────────────────
-- alter publication supabase_realtime drop table public.leads;
-- drop trigger if exists leads_set_updated_at on public.leads;
-- drop policy if exists "leads_dashboard_all" on public.leads;
-- drop table if exists public.leads;
-- drop function if exists public.set_updated_at();  -- only if unused elsewhere
