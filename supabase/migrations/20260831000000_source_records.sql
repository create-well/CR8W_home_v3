-- Flow 4: consolidate fragmented mirror tables into a clean jsonb cache.
-- Target project: CR8W Dashboard (axntibrdivccycxdwlzk)
--
-- Flow 4 Write Boundary (verbatim from Notion):
--   "Read-only cache pipeline from Notion to Supabase source_records.
--    Zero two-way drift. Promote intake only via explicit batch."
--
-- NOTE ON KEY CHOICE: uniqueness is (entity, page_id), NOT
-- (data_source_id, page_id). The existing mirror_* tables store notion_id
-- and notion_url but no data_source_id, so a data_source_id-based key
-- cannot be backfilled. data_source_id is nullable for the forward sync.

begin;

create table if not exists public.source_records (
  id                 uuid primary key default gen_random_uuid(),
  source             text        not null default 'notion',
  entity             text        not null,
  page_id            text        not null,
  data_source_id     text,
  notion_url         text,
  payload            jsonb       not null,
  content_hash       text        not null,
  notion_created     timestamptz,
  notion_last_edited timestamptz,
  synced_at          timestamptz not null default now(),
  constraint source_records_entity_page_uniq unique (entity, page_id)
);

create index if not exists source_records_payload_gin
  on public.source_records using gin (payload);

create index if not exists source_records_entity_synced_idx
  on public.source_records (entity, synced_at desc);

alter table public.source_records enable row level security;

drop policy if exists source_records_read on public.source_records;
create policy source_records_read
  on public.source_records
  for select
  to authenticated
  using (true);

comment on table public.source_records is
  'Canonical read-only jsonb cache of Notion pages. Notion is the human write surface. Writes only via service-role sync (Flow 4). Zero two-way drift.';

-- ---------------------------------------------------------------------------
-- Idempotent backfill from the three existing mirror tables.
--
-- Entity naming reflects the OPERATIONAL databases, not the architecture
-- registry. mirror_flows describes gatherings (venue, capacity, guests,
-- attended, media_cutoff, flow_keeper) and is NOT a mirror of the
-- "CR8W Executive OS | 6 System Flows" database.
-- ---------------------------------------------------------------------------

insert into public.source_records
  (entity, page_id, notion_url, payload, content_hash, notion_created, notion_last_edited, synced_at)
select
  'flows',
  f.notion_id,
  f.notion_url,
  to_jsonb(f) - 'notion_id' - 'notion_url' - 'last_synced',
  md5((to_jsonb(f) - 'notion_id' - 'notion_url' - 'last_synced')::text),
  f.notion_created,
  f.last_synced,
  f.last_synced
from public.mirror_flows f
on conflict (entity, page_id) do update
  set payload            = excluded.payload,
      content_hash       = excluded.content_hash,
      notion_url         = excluded.notion_url,
      notion_created     = excluded.notion_created,
      notion_last_edited = excluded.notion_last_edited,
      synced_at          = excluded.synced_at
where public.source_records.content_hash is distinct from excluded.content_hash;

insert into public.source_records
  (entity, page_id, notion_url, payload, content_hash, notion_created, notion_last_edited, synced_at)
select
  'people',
  p.notion_id,
  p.notion_url,
  to_jsonb(p) - 'notion_id' - 'notion_url' - 'last_synced',
  md5((to_jsonb(p) - 'notion_id' - 'notion_url' - 'last_synced')::text),
  p.notion_created,
  p.last_synced,
  p.last_synced
from public.mirror_people p
on conflict (entity, page_id) do update
  set payload            = excluded.payload,
      content_hash       = excluded.content_hash,
      notion_url         = excluded.notion_url,
      notion_created     = excluded.notion_created,
      notion_last_edited = excluded.notion_last_edited,
      synced_at          = excluded.synced_at
where public.source_records.content_hash is distinct from excluded.content_hash;

insert into public.source_records
  (entity, page_id, notion_url, payload, content_hash, notion_created, notion_last_edited, synced_at)
select
  'moves',
  m.notion_id,
  m.notion_url,
  to_jsonb(m) - 'notion_id' - 'notion_url' - 'last_synced',
  md5((to_jsonb(m) - 'notion_id' - 'notion_url' - 'last_synced')::text),
  m.notion_created,
  m.last_synced,
  m.last_synced
from public.mirror_moves m
on conflict (entity, page_id) do update
  set payload            = excluded.payload,
      content_hash       = excluded.content_hash,
      notion_url         = excluded.notion_url,
      notion_created     = excluded.notion_created,
      notion_last_edited = excluded.notion_last_edited,
      synced_at          = excluded.synced_at
where public.source_records.content_hash is distinct from excluded.content_hash;

commit;

-- Post-apply verification (run manually; expect flows=3, people=10, moves=0):
--   select entity, count(*) from public.source_records group by entity order by entity;
