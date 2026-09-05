# Notion mirror sync

One-way Notion → Supabase cache for Create Well OS. Closes [#56](https://github.com/create-well/CR8W_home_v3/issues/56).

> Notion writes. Supabase remembers. cr8w.com reads. Nothing writes backward.

This script **never writes to Notion**. It only reads.

## Why this shape

| Rejected | Why |
|---|---|
| Live Notion reads from the browser | Rate limits, latency, token exposure, breaks when Notion is slow |
| Two-way sync | Two write surfaces for one fact. You stop knowing which is right |
| Zapier | 100 tasks/month free tier burns out in under a day at this volume |
| Make | 1,000 credits/month and 15-minute minimum polling |
| n8n | Free software, but you pay for hosting and babysit a server |

**Chosen:** GitHub Actions cron + plain `fetch`. No dependencies, no hosting bill, runs on free Actions minutes.

## What it mirrors

| Notion database | Supabase table | Data source id |
|---|---|---|
| FLOWS | `public.mirror_flows` | `c1677843-dd13-4e37-9f80-e960b26847dc` |
| MOVES | `public.mirror_moves` | `5597e583-f7df-4f6c-90b0-296a26c57454` |
| PEOPLE | `public.mirror_people` | `b97bcbdf-2b1b-488d-9d07-4012b031732e` |

Plus `public.mirror_sync_runs` — a run log so the UI can show the last good sync time and never render a number it isn't sure about.

MONEY and CONTENT are deliberately not mirrored yet. Add them when a surface actually needs them.

## Behavior

- **Idempotent.** Upserts on `notion_id`. Re-running is safe and cheap.
- **Prunes deletions.** Rows archived or deleted in Notion leave the mirror.
- **Fails fast on auth.** 401/403/404 throw immediately. Only 429/529/5xx and network errors retry.
- **Backoff.** Exponential with jitter, honors `Retry-After`, 5 attempts max.
- **Paginates.** Follows `next_cursor` until exhausted.
- **Logs every run** to `mirror_sync_runs` with counts, or the error if it failed.

## Setup

Three repository secrets. Settings → Secrets and variables → Actions:

| Secret | Where to get it |
|---|---|
| `NOTION_API_TOKEN` | [notion.so/my-integrations](https://notion.so/my-integrations) → your integration → Internal Integration Secret |
| `SUPABASE_URL` | `https://axntibrdivccycxdwlzk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |

**Then share the three databases with the integration.** In Notion, open each of FLOWS, MOVES, PEOPLE → `•••` → Connections → add your integration. Without this the API returns 404 even though the databases exist.

## Run it

```bash
# Dry run: reads Notion, writes nothing
DRY_RUN=1 NOTION_API_TOKEN=ntn_xxx node scripts/notion-to-supabase.mjs

# Real run
NOTION_API_TOKEN=ntn_xxx \
SUPABASE_URL=https://axntibrdivccycxdwlzk.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node scripts/notion-to-supabase.mjs
```

In CI it runs every 30 minutes, or manually via Actions → Notion mirror sync → Run workflow.

## Cadence

30 minutes. Matches the Backend Hub's "manual mirror over real-time sync" decision and stays far inside Notion's rate limits. If you later want near-instant updates for one specific surface, add a Notion webhook → Supabase Edge Function for that surface only. Do not lower this cron to chase real-time.

## Reading it

```sql
-- The board: active flows by status
select name, type, status, date_start, venue
from mirror_flows
where status not in ('Wrapped','Cancelled')
order by date_start;

-- Moves that need a human
select name, status, due, blocked_by
from mirror_moves
where status in ('Now','Next')
order by due nulls last;

-- Last good sync (for the staleness banner)
select finished_at, status, flows_count, moves_count, people_count
from mirror_sync_runs
where status = 'ok'
order by finished_at desc
limit 1;
```

## Schema note

Relation columns (`flow_keeper`, `guests`, `owner`, `flow`, etc.) store JSON arrays of Notion page ids. Join them against `mirror_people.notion_id` or `mirror_flows.notion_id` in the app layer. They are intentionally not foreign keys, because Notion is the source of truth and a partial sync should never fail on referential integrity.
