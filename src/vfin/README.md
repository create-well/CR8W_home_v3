# VFIN additive dashboard port

This directory isolates reusable design-source dashboard components from the live workflow application. It is intentionally **not mounted in `src/App.tsx`**. The production application retains its existing authentication gate, route ownership, Supabase realtime hooks, API polling, and Notion sync controls while this port receives review.

## Entrypoints

| File | Purpose | Data rule |
|---|---|---|
| `adapter.ts` | Converts host-provided live data into `DashboardPayload` | Pure transformation; no service calls |
| `contracts.ts` | Defines portable Decision/System view contracts and visibility helpers | Types and state derivation only |
| `components/VfinViewShell.tsx` | Six-condition state wrapper | Consumes `ModuleState`; no provider imports |
| `surfaces/DecisionsSurface.tsx` | Add/decide/defer interaction pattern | Callback-only; host persists actions when approved |
| `surfaces/SystemSurface.tsx` | Health, freshness, inventory, and contract pattern | Host provides status and retry callback |
| `fixtures.ts` | Development-only mock payload and decision fixture | Explicitly marked `source: 'MOCK'` |
| `vfin.css` | Strictly `.vfin-*` scoped styling | Cannot alter existing dashboard view styles |

## Route contract and state mapping

The live application retains `/`, `/moves`, `/care`, `/flows`, `/money`, `/decisions`, and `/system`. `/money` remains compatible with the user-facing **The Source** label. A later approved integration may additionally route `/source` to the same resource surface.

| Required condition | Workflow `ModuleState` | VFIN rendering |
|---|---|---|
| Loading | `loading` | Progress message |
| Empty | `empty-but-healthy` | Calm empty invitation |
| Ready | `ready` | Surface content |
| Stale | `stale` | Surface content plus freshness notice |
| Failed | `sync-failed` | Recovery state with host-provided retry |
| Restricted | `permission-restricted` | Consent/stewardship explanation |

## Authorization boundary

Source Flow permission remains case-insensitive through the existing roster `monny`, `sunshine`, `bingle`, `omar`, and `pia`. The port carries no direct Supabase, Notion, HTTP, or database access. Care stays permission-restricted until `careConsent` is explicitly `granted`; no ported component introduces automatic outreach or channel opening.

## Recommended next integration

Create a new focused branch after this port is approved. Mount only **Decisions** or **System** first, build its payload with `createLiveDashboardPayload`, pass existing workflow callbacks to the component, add behavior tests, and review its Vercel preview before replacing the present live route implementation.
