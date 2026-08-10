# CR8W Home v3 (Create Well Dashboard)

Team dashboard for the Create Well Collective. React/Vite/Supabase, deployed to Vercel.

> Live: https://cr8w.com  
> Repo: https://github.com/create-well/CR8W_home_v3

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres + Realtime + Edge Functions)
- **Auth:** Profile-based (localStorage) + Supabase profiles table for roles
- **Host:** Vercel (static build)
- **Notion Sync:** Bidirectional via Edge Functions (`sync-to-notion`, `sync-from-notion`)

## Architecture: Hybrid (Realtime + Legacy)

v3 introduced Supabase real-time tables for core production data. Legacy KV store still handles some features.

### ✅ Realtime (Supabase tables + hooks)
| Feature | Table(s) | Hook |
|---------|----------|------|
| Calendar Events | `calendar_events` | `useCalendarRealtime` |
| Podcast | `episodes`, `guests`, `topic_drops` | `usePodcastRealtime` |
| CoFlow | `coflow_checkins` | `useCoFlowRealtime` |
| Workshops | `workshops`, `applicants` | `useWorkshopRealtime` |
| Revenue | `revenue_ops` | `useRevenueRealtime` |

### ⚠️ Legacy (KV store via API polling)
| Feature | Notes |
|---------|-------|
| Tasks | Planned for v3.1 migration |
| Forum | Planned for v3.x migration |
| Messages | Planned for v3.x migration |
| Brain Dumps | Planned for v3.x migration |
| Well Notes | Planned for v3.x migration |
| Announcements | Planned for v3.x migration |

## Supabase Project

- **Project:** CR8W Dashboard v3
- **Ref:** `axntibrdivccycxdwlzk`
- **URL:** `https://axntibrdivccycxdwlzk.supabase.co`
- Safe config: `src/utils/supabase/config.ts`
- **NEVER edit** `src/utils/supabase/info.tsx` — Figma Make autogenerates it

## Notion Integration

- **Workspace:** hello@takehome.studio
- Token + DB IDs stored in Supabase secrets (via `get_notion_secrets()` RPC)
- Databases: Episodes, Guests, Topic Drops, Workshops, Applicants, Revenue, CoFlow Check-ins

## Team Access

Profiles: monny, sunshine, bingle, omar (core), pia (co-creator)

Role-based views filter what each person sees.

## Running locally

```bash
cd /Users/monicablanco/Desktop/createwell/CR8W_home_v3
npm i
npm run dev
```

## Deploy

```bash
npm run build
npx vercel --prod --yes
```

Or push to `main` — Vercel auto-deploys to cr8w.com.

## v3 Changelog

- Added `public.calendar_events` table with RLS + realtime
- Added `useCalendarRealtime.ts` hook
- Edge Functions versioned in `supabase/functions/`
- Calendar events removed from legacy sync polling
