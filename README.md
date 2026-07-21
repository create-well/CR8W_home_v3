# CR8W Home v2 (Create Well Dashboard)

Team dashboard for the Create Well Collective. Figma Make code bundle, deployed to Vercel.

> Design source: https://www.figma.com/design/GlYHRxPiD8TIw5lFSu4ALe/CR8W-Dash-v2
> Live: https://cr8w.com

## Stack (source of truth)

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Auth:** Supabase email/password
- **Backend:** Supabase Edge Function `server` + **KV store** (see below)
- **Host:** Vercel (serverless `/api/server`). NOT Netlify.
- **Repo:** `monnylog/CR8W_home_v2`

## Backend architecture: KV store, not relational

All app data (tasks, forum, messages, workshops, coflow, well-notes, calendar) is stored as
JSON blobs in a **single table** `kv_store_8dcd9693`, accessed through the Edge Function
`server` at routes `/make-server-8dcd9693/...`.

There are **no** per-feature Postgres tables (no `events`, `workshops`, `ideas`,
`presence`, `read_receipts`, etc.). Any spec that assumes relational tables is stale.
Add features by adding KV keys + server routes, not new tables.

## Supabase project (current)

- **Project:** CR8W Dashboard v2
- **Ref:** `axntibrdivccycxdwlzk`
- **URL:** `https://axntibrdivccycxdwlzk.supabase.co`
- Publishable key lives in `utils/supabase/info.tsx` and `src/app/components/AuthGate.tsx`.
- Old ref `qwckjmktcnlwxqgnbtet` ("Create Well Dashboard") is ABANDONED. Do not use.

## Team access

Login email maps to a profile in `src/app/components/AuthGate.tsx` (`EMAIL_PROFILE_MAP`).
Current members: monny, sunshine, bingle, omar. Add new members there.

## Running locally

```bash
npm i
npm run dev
```

## Deploy

Push to `main`; Vercel auto-deploys to cr8w.com.
