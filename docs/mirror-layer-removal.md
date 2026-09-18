# Removed: the `mirror_*` sync layer

Removed 2026-09-08 per [#77](https://github.com/create-well/CR8W_home_v3/issues/77).

## What was removed

| Path | Why |
|---|---|
| `.github/workflows/notion-mirror.yml` | Failed every 30 minutes since 2026-09-05. Secrets were never set. |
| `scripts/notion-to-supabase.mjs` | Wrote to `mirror_*`, which nothing read. |
| `worker/` | Notion Worker whose only data source was `mirror_*`. |
| `docs/notion-mirror.md` | Documented the above. |

## Why it was wrong

It was built against the Notion **Create Well OS Backend Hub** page, which describes a five-database model (FLOWS, MOVES, PEOPLE, MONEY, CONTENT) with a strict one-way contract: *"Notion writes. Supabase remembers. cr8w.com reads. Nothing writes backward."*

The deployed system is a different architecture: **seven databases, deliberately bidirectional.** `supabase/functions/sync-from-notion` and `sync-to-notion` both reference `NOTION_DB_EPISODES`, `NOTION_DB_GUESTS`, `NOTION_DB_TOPIC_DROPS`, `NOTION_DB_WORKSHOPS`, `NOTION_DB_APPLICANTS`, `NOTION_DB_COFLOW`, and `NOTION_DB_REVENUE_OPS`, with loop prevention via a `Sync Status` field and Notion winning on conflict.

A `grep` for `mirror_` across `src/`, `supabase/`, and `scripts/` returned matches **only** in the removed files. The layer was an island: nothing consumed it, and its own producer never ran successfully.

## Root cause, for next time

A Notion architecture page and the deployed code disagreed, and the Notion page was treated as authoritative without checking whether the code agreed.

**Rule going forward: the deployed code and `supabase/config.toml` are the source of truth for what the system does. Notion pages describe intent, which may be aspirational or stale.** Reconcile against code before building a data layer.

## Database cleanup, still to run

Removing the code does not drop the tables. Run when convenient:

```sql
drop table if exists public.mirror_flows;
drop table if exists public.mirror_moves;
drop table if exists public.mirror_people;
drop table if exists public.mirror_sync_runs;
drop table if exists public.engineering_delivery_mirror;
```

Row counts at audit (2026-08-31): `mirror_flows` 3, `mirror_people` 10, `mirror_moves` 0, `mirror_sync_runs` 1, `engineering_delivery_mirror` 0. No production data is lost.

## The one idea worth keeping

The worker exposed two read-only tools (`getWellBoard`, `getStuck`) so Notion Custom Agents could query real operational state. The **tools** were useful; their **data source** was dead.

If wanted, rebuild against the seven canonical tables (`episodes`, `guests`, `topic_drops`, `workshops`, `applicants`, `coflow_checkins`, `revenue_ops`) so that "Executive weekly briefing" and "THS Operations Partner" can report real state. Tracked separately, not restored here.
