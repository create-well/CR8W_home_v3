-- Rollback for 20260831000000_source_records.sql
--
-- Safe: the legacy mirror_* tables were never modified by the forward
-- migration, so dropping source_records fully restores prior state.
-- mirror_sync_runs is the sync audit log and is likewise untouched.

begin;

drop policy if exists source_records_read on public.source_records;

drop index if exists public.source_records_entity_synced_idx;
drop index if exists public.source_records_payload_gin;

drop table if exists public.source_records;

commit;
