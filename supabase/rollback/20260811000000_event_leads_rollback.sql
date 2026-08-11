-- Rollback for supabase/migrations/20260811000000_event_leads.sql
-- Drops ONLY what that migration created:
--   - the event_leads table
--   - its RLS policy "event_leads_dashboard_all" (dropped with the table)
--   - its supabase_realtime publication entry (removed automatically on drop)
-- Nothing else is touched. Idempotent.
--
-- Run manually via SQL Editor or: supabase db execute --file supabase/rollback/20260811000000_event_leads_rollback.sql
-- Kept outside supabase/migrations/ so `supabase db push` never runs it.

drop table if exists public.event_leads;
