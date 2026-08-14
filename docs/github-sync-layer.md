# CR8W GitHub sync layer

This branch adds the first version of a GitHub-backed sync ledger for CR8W.

## Intent

Supabase remains the live operational database and realtime source for the dashboard. GitHub becomes the versioned content/config mirror.

```txt
CR8W dashboard ⇄ Supabase Realtime/Postgres ⇄ GitHub content files
```

## Added pieces

- `github_sync_sources` — which repo/branch/base path to sync with.
- `github_sync_mappings` — row-to-file mappings, GitHub SHA, and hashes.
- `github_sync_runs` — audit trail for push/pull sync attempts.
- `github_sync_conflicts` — manual conflict queue.
- `sync/github-sync-config.json` — table-to-file-path map.
- `sync-to-github` Edge Function — pushes selected Supabase rows into `content/`.
- `sync-from-github` Edge Function — conservative scaffold for pull sync.
- `github-webhook` Edge Function — conservative scaffold for GitHub push webhooks.

## Required secret

Store a GitHub token in Supabase Vault as:

```txt
GITHUB_TOKEN
```

The token needs contents read/write access to `create-well/CR8W_home_v3`.

## First sync targets

- `well_notes` → Markdown
- `tasks` → JSON
- `topic_drops` → Markdown
- `episodes` → JSON
- `guests` → JSON
- `workshops` → JSON
- `revenue_ops` → JSON

## Safety posture

The first implementation pushes from Supabase to GitHub. Pull sync and webhook ingestion are scaffolded but intentionally not destructive until table-specific parsers and conflict rules are reviewed.
