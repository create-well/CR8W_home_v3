# CR8W v3 — no-Supabase migration

Status: **planning branch only.** Nothing here is wired into the running app.
Production `main` is untouched at commit `10ce1a19`.

## Target architecture

Notion stays canonical for every human-edited fact. Vercel serverless functions
are the only thing that talks to Notion, holding the token server-side. The
browser talks only to our own endpoints. There is no replica database.

```
Notion (canonical)
  -> Vercel serverless API (server-only token, retry/backoff)
       -> React dashboard (reads JSON, shows syncedAt)
       -> public programming feed
       -> validated intake -> new Notion PEOPLE row
```

The governing rule is unchanged: one write surface per fact. If a fact can be
edited in two places, one of them is wrong and nobody can tell which.

## What this branch adds

| File | Purpose |
| --- | --- |
| `api/notion.ts` | Server-only client: pagination, Retry-After, backoff on 429/5xx |
| `api/health.ts` | Reports config presence and intake flag. Never returns secrets |
| `api/dashboard.ts` | Restricted FLOWS + MOVES projection with `syncedAt` and `degraded` |
| `api/public-flows.ts` | `Public? = true` and publishable Status only |
| `api/intake.ts` | Off unless `INTAKE_ENABLED=true`. Leaves consent blank by design |
| `.env.notion.example` | Variable names and non-secret data-source ids |

Nothing was deleted. No Supabase file, migration, Edge Function, workflow, or
dependency was modified.

## Field mapping (verified against the live schema)

**FLOWS** — Name (title), Type, Status, Date, Media Cutoff, Venue, Capacity,
`Public?`, Moves (relation count only).
Status options: Idea, Scheduled, Ready, Approved, Happened, Wrapped, Cancelled.
Type options: Podyap, Open Studio, Book Club, Workshop, Pop-Up, Surprise-ment,
Geyser, Internal.

**MOVES** — Name (title), Status, Type, Due, Blocked By.
Status options: Now, Next, Done, Dropped. `Dropped` is a real outcome and is
filtered out of the dashboard rather than hidden.

**PEOPLE** — write-only from `api/intake.ts`. Name, Email, Source, Well Level.
No read endpoint exists. Email, Phone, Handle, Consent, Consent Captured,
Notes, Owner, Next Invitation, and every relation are intentionally unexposed.

## Security actions required before any deploy

1. **Rotate the Notion integration token.** A live token is committed in
   `CR8W_Developer_SOP.md` and this repository is public. Treat it as burned.
   Rotating it also invalidates whatever the old Supabase functions were using,
   so schedule it deliberately.
2. **Purge the token from git history.** A follow-up commit that deletes the
   line is not sufficient; the blob remains reachable.
3. **Rotate the Supabase publishable key** if that project stays up during the
   transition.
4. **Set `NOTION_TOKEN` in Vercel only.** Never with a `VITE_` prefix, which
   would inline it into the client bundle.

### Open Supabase advisories

- `pg_net` is installed in the `public` schema.
- Five `SECURITY DEFINER` functions are executable by `anon`:
  `current_profile_role`, `is_active_user`, `is_admin_user`,
  `is_collaborator_user`, `is_private_user`.
- Leaked-password protection is disabled in Auth.

These matter while the project remains live. They stop mattering once it is
retired, which is the argument for not lingering in a half-migrated state.

## Verified Supabase inventory

Project `axntibrdivccycxdwlzk` ("CR8W Dashboard v2"), region us-west-1,
status ACTIVE_HEALTHY. Exact `COUNT(*)` verification on 2026-08-24 found
**64 rows across 22 public tables**:

| Table | Exact rows |
| --- | ---: |
| `kv_store_8dcd9693` | 19 |
| `mirror_people` | 10 |
| `profiles` | 7 |
| `tasks` | 5 |
| `activities` | 4 |
| `mirror_flows` | 3 |
| `topic_drops` | 3 |
| `coflow_checkins` | 2 |
| `event_leads` | 2 |
| `events` | 2 |
| `ideas` | 2 |
| `workshops` | 2 |
| `episodes` | 1 |
| `guests` | 1 |
| `mirror_sync_runs` | 1 |
| `applicants` | 0 |
| `calendar_events` | 0 |
| `mirror_moves` | 0 |
| `revenue_ops` | 0 |
| `team_members` | 0 |
| `well_notes` | 0 |
| `workshop_feedback` | 0 |

`coflow_checkins` contains two test rows, not 237 operational records. It
requires no archive or migration. The prior 237 count was a stale planner
estimate, not an exact count.

Five active Edge Functions remain: `make-server-8dcd9693`, `sync-to-notion`,
`sync-from-notion`, `server`, `sync-notion-permissions`.

The verified counts reinforce the migration choice: this is a small amount of
legacy application state, plus duplicated Notion mirrors, wrapped in a large
amount of Supabase infrastructure. `mirror_*` duplicates facts Notion already
owns and should be retired after their Vercel→Notion consumers are replaced.

## Migration order

1. **Secrets.** Rotate and purge. Tag the current deployment first.
2. **Boundary.** Ship these endpoints. Verify `/api/health` and `/api/dashboard`
   against production Notion data before changing any view.
3. **One view.** Move a single low-risk screen off Supabase and delete its
   realtime hook. Prefer tasks or content.
4. **Remaining views.** Repeat per screen. Ten realtime hooks currently exist:
   leads, tasks, coflow, revenue, podcast, workshops, workshop feedback,
   calendar, well notes, and the dashboard hub.
5. **Legacy review.** The two `coflow_checkins` rows are test data and require
   no migration. Review the 19-key KV store and the remaining small task,
   content, event, and profile records for either Notion migration or deliberate
   retirement; do not recreate empty tables.
6. **Removal.** After a full rollback window with no Supabase traffic, delete
   the client SDK, `supabase/`, and stale env vars in one reviewed PR.

## Replacing realtime

Realtime subscriptions go away. Replace them with fetch on mount, refetch on
window focus, an explicit Refresh control, and a 60-120s poll on genuinely
active screens only. Show `syncedAt` in the UI. When `degraded` is true, show
the last known good time and a banner instead of rendering zeros as if they
were real.

## Rollback

Delete this branch. Nothing else is required. No migration was applied, no
Edge Function was redeployed, no environment variable was changed, and `main`
still points at `10ce1a19`.
