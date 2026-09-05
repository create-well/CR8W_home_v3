# CR8W ops worker

Exposes the Supabase mirror as tools your Notion Custom Agents can call.

Worker: `01a033b2-feb8-7686-a119-c8ec68e59c83`
Workspace: `66324acf-799d-81bf-ae23-00038ab99002` (co-monny)

## Why tools, not a sync

`worker.sync` writes **into** a Notion-managed database. It is built for external API → Notion. It cannot push Notion → Supabase, so it is the wrong shape for the mirror.

The mirror stays where it belongs:

| Direction | Runs on | Cost |
|---|---|---|
| Notion → Supabase | GitHub Actions cron, [PR #62](https://github.com/create-well/CR8W_home_v3/pull/62) | $0 |
| Supabase → Notion agents | This worker, tool calls | ~$0.0023/call after Oct 15, 2026 |

Tool calls only bill when an agent actually invokes one. A weekly briefing that calls `getStuck` once is about a penny a month. Workers are free during beta on Business and Enterprise until October 15, 2026.

## Tools

### `getWellBoard`

Full production state. Flows grouped by status, open Moves, team roles, bottlenecks, and mirror freshness.

Optional input: `includeClosed` (default false) to include Wrapped and Cancelled flows.

### `getStuck`

Bottlenecks only. Cheaper and faster for standups and briefings.

Both tools are **read-only**. Neither writes to Notion or Supabase.

## Bottleneck rules

Both tools share one rule set, so they can never disagree:

- Flow is `Idea` or `Scheduled` with fewer than 14 days until its date
- Flow is `Approved` with no Flow Keeper assigned
- Flow is `Ready` with no Venue
- Move is blocked (`Blocked By` is set)
- Move is past its due date
- `[PREVIEW]` flows still on the board
- MOVES is empty, or nothing is marked `Now`
- People rows with no Roles

## Staleness

Every response includes `lastSynced` and a `stale` boolean. Stale means the 30-minute mirror cron has missed three or more runs, and the response carries an explicit `caveat` telling the agent to treat numbers as last-known rather than current.

This enforces the Backend Hub rule: stale beats wrong. An agent should never confidently report a number the system is unsure about.

## Deploy

```bash
cd worker
npm install

# Point at the workspace
export NOTION_WORKSPACE_ID=66324acf-799d-81bf-ae23-00038ab99002

# Secrets the tools need
ntn workers env set SUPABASE_URL=https://axntibrdivccycxdwlzk.supabase.co
ntn workers env set SUPABASE_KEY=<service_role key>

# First deploy creates workers.json; later deploys update in place
ntn workers deploy --name cr8w-ops

# Verify
ntn workers list
ntn workers capabilities
```

If you already created worker `01a033b2-feb8-7686-a119-c8ec68e59c83` and want this code to update that one rather than create a second, deploy once and check `ntn workers list`. If a duplicate appears, remove the extra with `ntn workers rm <id>`.

## Test before wiring to an agent

```bash
ntn workers exec getStuck
ntn workers exec getWellBoard -d '{"includeClosed": false}'

# Run locally instead of in the cloud
ntn workers exec getStuck --local
```

## Wire to your agents

Once deployed, the tools appear in Custom Agent configuration. The two agents that gain the most:

- **Executive weekly briefing** — add `getStuck` so the briefing reports real Create Well state instead of generic prompts
- **THS Operations Partner** — add `getWellBoard` so it can answer "what is active" with actual data

## Local dev

```bash
npm run check   # typecheck
npm run build   # compile to dist/
```

Verified against `@notionhq/workers` 0.8.11.
