-- Migration: well_notes — move Well Notes off the legacy KV store onto realtime
-- Replaces the KV-backed /well-notes server routes (left intact for rollback).
-- Safe: creates a new table only; does not touch the KV store, the server
-- Edge Function, or any existing realtime table.
-- Rollback: supabase/rollback/20260813000000_well_notes_rollback.sql
--
-- Decisions:
-- - Mirrors the legacy WellNote shape (src/api.ts): id, content, landed, created_at.
--   `landed` is a counter (incremented when a note "lands" with someone), not a flag.
-- - No updated_at: the legacy shape has none and notes are append-only apart
--   from the landed counter, matching the project's new-table convention
--   (SOP.md §3.3) which does not use one.

create table if not exists public.well_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  landed integer not null default 0 check (landed >= 0),
  created_at timestamptz not null default now()
);

-- RLS: the internal dashboard connects with the publishable (anon) key and
-- gates access in-app by profile, matching the existing tables (tasks,
-- event_leads, workshops, ...). Both anon and authenticated roles need access.
alter table public.well_notes enable row level security;

drop policy if exists "well_notes_dashboard_all" on public.well_notes;
create policy "well_notes_dashboard_all" on public.well_notes
  for all to anon, authenticated
  using (true) with check (true);

-- Realtime publication for postgres_changes subscriptions.
alter publication supabase_realtime add table public.well_notes;
