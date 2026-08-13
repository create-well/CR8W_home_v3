-- Rollback for supabase/migrations/20260813000000_well_notes.sql
-- Drops ONLY what that migration created:
--   - the well_notes table
--   - its RLS policy "well_notes_dashboard_all" (dropped with the table)
--   - its supabase_realtime publication entry (removed automatically on drop)
-- Nothing else is touched. The legacy KV /well-notes routes in the server
-- Edge Function were never removed, so the app can fall back to them.
-- Idempotent.
--
-- Run manually via SQL Editor or: supabase db execute --file supabase/rollback/20260813000000_well_notes_rollback.sql
-- Kept outside supabase/migrations/ so `supabase db push` never runs it.

drop table if exists public.well_notes;
