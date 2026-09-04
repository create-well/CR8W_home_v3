# PUBLIC SURFACE MIGRATION SPEC (cr8w.com → CR8WDashVfin)

## Scope and evidence notes

- This document is based on repository inspection at `HEAD` plus shallow-history expansion for removed waitlist files.
- Current repo route/auth behavior comes from:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L337-L339`
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L492-L499`
- Waitlist UI copy is **not present at HEAD**. I checked:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src` (full text search for heading/button strings)
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/public`
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx`
- The exact copy in the problem statement matches historical file content in:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L23-L39`

---

## 1) Waitlist (highest priority)

### 1.1 Component that renders the form

- **Historical implementation matching live-copy text:**  
  `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L5-L42`
  - Heading/subtext/fields/buttons match exactly at `L23-L39`.
- **Current HEAD status:** unknown for UI location in checked-in files (the component was removed from current tree).  
  Current unauthenticated flow goes straight to auth gate at `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L337-L339`.

### 1.2 Submit flow (endpoint/function/client call)

- Client submit function in historical waitlist component:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L10-L19`
  - Calls `api.addSignup(clean, name.trim(), 'landing')` at `L16`.
- Historical API helper:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/api.ts@e23902a:L96-L99`
  - `addSignup` does `POST /signups`.
- Server endpoint:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L412-L437`
  - Public POST to `/signups` is explicitly allowed at `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L87-L91`.

### 1.3 Where submissions are stored

- Stored in Supabase table: `kv_store_8dcd9693` (`TABLE`) at:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L40`
- Under key `cr8w_signups`:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L416`
- Data is JSON list in KV row (`kvGet`/`kvSet`/`getList`/`setList`):
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L43-L59`

### 1.4 Environment variables involved (names only)

- Waitlist submit backend path (`/api/server/signups`) depends on:
  - `SUPABASE_URL`
  - `SUPABASE_SECRET_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_PUBLISHABLE_KEY` (auth verification path in same handler, not required for public signup POST)
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L15-L18`, `L26-L37`
- Historical client base-url override:
  - `VITE_API_BASE`
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/api.ts@e23902a:L9-L23`
- Current client base-url override (same concept in current API helper):
  - `VITE_API_BASE`
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/api.ts:L6-L19`

### 1.5 Validation and duplicate handling

- Client-side (historical waitlist UI):
  - Lowercases + trims email, regex check before request.
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L12-L14`
- Server-side:
  - Validates email regex and returns `400` if invalid.
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L419-L421`
- Duplicate email behavior:
  - Case-insensitive dedupe against existing list.
  - Returns success (`200`, `{ ok: true, deduped: true }`) for duplicates.
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L423-L425`

### 1.6 User-visible success/failure outcomes

- Historical waitlist UI behavior:
  - Success text: `You're in — welcome home. ✦`
  - Error text: `Please enter a valid email and try again.`
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L25-L27`, `L36`
- Duplicate submit is treated as success server-side (`deduped: true`), so UI lands in success path.
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L423-L425` and UI `setStatus('done')` on successful call at `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L16-L18`

### 1.7 Confirmation email or outbound send

- **No confirmation email/send logic found** in waitlist submit path checked:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L412-L437`
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L10-L19`
- No mailer call/module is referenced in these paths.

---

## 2) Public versus gated (`src/views/`)

Auth/routing mechanism:
- Public routes declared first: `/content`, `/content/:slug`.
- Fallback `*` route mounts `DashboardApp`.
- `DashboardApp` immediately renders `AuthGate` when unauthenticated.
- Evidence:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L495-L497`
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L337-L339`

| View file | Reachable without auth? | Mechanism / notes |
|---|---|---|
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PublicContent.tsx` | **Yes** | Routed directly at app root: `/content` and `/content/:slug` (`App.tsx:L495-L496`), bypassing `DashboardApp` auth gate. |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PodcastView.tsx` | **No** | Only rendered inside `DashboardApp` when `authed` and `currentView === 'podcast'` (`App.tsx:L337-L339`, `L400-L413`). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/HubView.tsx` | **No** | Rendered only in `DashboardApp` for `currentView === 'hub'` (`App.tsx:L387-L399`). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/WorkshopsView.tsx` | **No** | Rendered only in `DashboardApp` for `currentView === 'workshops'` (`App.tsx:L415-L433`). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/DecisionsView.tsx` | **No** | Rendered only in `DashboardApp` for `currentView === 'well'` (`App.tsx:L435`). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/CoFlowView.tsx` | **No** | Rendered only in `DashboardApp` for `currentView === 'coflow'` (`App.tsx:L437-L446`). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/SystemView.tsx` | **No** | Rendered only in `DashboardApp` for `currentView === 'team'` (`App.tsx:L448-L450`). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/RevenueView.tsx` | **No** | Rendered only in `DashboardApp` for `currentView === 'revenue'` (`App.tsx:L452-L460`). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/TeamView.tsx` | **No (currently unreachable)** | Imported but not rendered in `App.tsx` (`import` at `L15`; no JSX usage). |
| `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/WellView.tsx` | **No (currently unreachable)** | Imported but current `well` route uses `DecisionsView` (`import` at `L12`; `DecisionsView` at `L435`). |

Role gating inside authenticated dashboard:
- Allowed views computed by role via `viewsForRole`.
- Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L73-L77`, `L334-L336`

---

## 3) Dependencies of portable views (`PublicContent.tsx`, `PodcastView.tsx`)

## 3.1 `/src/views/PublicContent.tsx`

- Props:
  - `PublicContentIndex()`: none (`/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PublicContent.tsx:L50`)
  - `PublicContentPage({ slug: string })` (`.../PublicContent.tsx:L96`)
  - `PublicContentNotFound()`: none (`.../PublicContent.tsx:L129`)
- Imports outside `src/views/`:
  - `react` (`useEffect`) at `L1`
  - `lucide-react` icons at `L2`
  - `../lib/content` at `L3`
  - `../components/MarkdownContent` at `L4`
- React context consumed: **none found** (no `useContext` usage in file).
- Data fetching:
  - No network/API fetch in component.
  - Uses `getPublicContent()` / `getPublicContentBySlug()` from `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/lib/content.ts:L87-L93`.
  - That module loads local MDX via `import.meta.glob('../../content/*.mdx', { eager: true, query: '?raw' })` at `.../src/lib/content.ts:L15-L19`.
- Assets/styles/fonts:
  - Relies on global stylesheet class family `.public-content-*` (`/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/styles/cr8w.css:L679-L970`).
  - Fonts are loaded in `/home/runner/work/CR8W_home_v3/CR8W_home_v3/index.html:L11-L13` and mapped to CSS vars at `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/styles/cr8w.css:L16-L18`.
- npm/runtime packages needed:
  - `react`
  - `lucide-react`

## 3.2 `/src/views/PodcastView.tsx`

- Props (all required):
  - `episodes`, `guests`, `topicDrops`
  - `onAddEpisode`, `onUpdateEpisode`, `onDeleteEpisode`
  - `onAddGuest`, `onUpdateGuest`
  - `onAddTopicDrop`, `onUpdateTopicDrop`
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PodcastView.tsx:L4-L15`
- Imports outside `src/views/`:
  - `react` (`useState`, `useMemo`) at `L1`
  - Type imports from `../api` at `L2`
- React context consumed: **none found**.
- Data fetching / service calls:
  - **No direct fetches or service-module calls in `PodcastView.tsx`**.
  - It delegates writes through callback props (e.g., `onAddEpisode`, `onUpdateTopicDrop`) at `L131-L183`.
  - In current app wiring, callbacks come from realtime hooks in `App.tsx` (`usePodcastRealtime`) and are passed into `PodcastView` at `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L115-L127`, `L401-L412`.
- Assets/styles/fonts:
  - Uses shared global classes (`card`, `view-grid`, `pipeline-card`, `badge`, `modal-*`, etc.), e.g. `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PodcastView.tsx:L187`, `L236`, `L303`, `L759-L763`.
  - These styles are defined in `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/styles/cr8w.css` (global tokens/classes).
- npm/runtime packages needed:
  - `react`

**Migration note (target constraint):** `PodcastView.tsx` already follows the target rule “view does not call services directly”; `PublicContent.tsx` currently reads content through `src/lib/content.ts` local-module loading, not typed dashboard context.

---

## 4) Notion content pipeline

### 4.1 What it does and what triggers it

1. **Notion → website content files (`content/*.mdx`)**
   - Workflow: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/.github/workflows/notion-content-sync.yml:L1-L80`
   - Triggers: scheduled hourly cron (`L12`) and manual dispatch (`L4-L10`)
   - Worker script: `node scripts/notion-content-sync.mjs` (`L56`)
   - On non-dry scheduled/manual-non-dry runs, commits updated `content/` files (`L58-L69`)

2. **Notion Revenue data source → Google Sheets mirror**
   - Workflow: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/.github/workflows/notion-to-sheets.yml:L1-L61`
   - Triggers: daily cron (`L12`) and manual dispatch (`L4-L10`)
   - Worker script: `node scripts/notion-to-sheets.mjs` (`L45`)

3. **Runtime dashboard Notion sync controls (separate from content/ generation)**
   - UI trigger calls Supabase edge functions `sync-to-notion` and `sync-from-notion`:
     - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/api.ts:L429-L457`
   - Server route exposing sync run history:
     - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L179-L185`

### 4.2 Notion databases/data sources and IDs found in code

- Content-sync script reads one configured source via env:
  - `NOTION_CONTENT_DB` (legacy database query path)
  - or `NOTION_CONTENT_DATA_SOURCE_ID` (new data source query path)
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-content-sync.mjs:L21-L27`, `L76-L79`
- Revenue sync reads `NOTION_DATA_SOURCE_ID`:
  - Evidence: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-to-sheets.mjs:L6-L17`, `L36-L37`
- IDs found in-repo:
  - `d029c5b2-5473-8356-bd35-07c8e713e2c1` (`.env.notion-sheets.example:L5`, `scripts/local-sheets-write-smoke.mjs:L6`)
  - `3c624acf-799d-81bd-9861-d05f3efc5b20` (synced content frontmatter page id: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/content/cr8w-publishing-test.mdx:L9`)
- Unknown:
  - Active production value(s) of `NOTION_CONTENT_DB` / `NOTION_CONTENT_DATA_SOURCE_ID` used for content publishing (not committed; sourced from GitHub vars/secrets in workflow env).

### 4.3 Content flow from Notion into rendered site

1. Script queries Notion pages and blocks:
   - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-content-sync.mjs:L72-L85`, `L196-L208`
2. Script renders MDX frontmatter + body and writes to `content/`:
   - `renderMdx` at `L210-L225`
   - file write at `L236-L252`
3. Frontend loads `content/*.mdx` at build time:
   - `import.meta.glob('../../content/*.mdx', { eager: true, query: '?raw' })` at `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/lib/content.ts:L15-L19`
4. Frontend filters `audience === 'public'`:
   - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/lib/content.ts:L84-L85`
5. `PublicContentIndex/Page` render the result:
   - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PublicContent.tsx:L50-L127`

### 4.4 What lives in `content/` vs `templates/`

- `content/`
  - Generated (and/or retained) published MDX records + sync manifest:
    - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/content/cr8w-publishing-test.mdx`
    - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/content/.notion-sync-manifest.json`
- `templates/`
  - Static Notion page templates (`privateTemplate`, `collaboratorTemplate`) in:
    - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/templates/notionViews.mjs:L1-L68`
  - Not used by runtime site rendering; referenced by tests:
    - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/tests/notionViews.test.mjs:L3-L29`

### 4.5 Environment variables (names only)

- From `.env.notion-content.example` + content workflow/script:
  - `NOTION_TOKEN`
  - `NOTION_CONTENT_DB`
  - `NOTION_CONTENT_DATA_SOURCE_ID`
  - `NOTION_VERSION`
  - `NOTION_PUBLISHED_STATUSES`
  - `NOTION_STATUS_PROPERTY`
  - `NOTION_TITLE_PROPERTY`
  - `NOTION_SLUG_PROPERTY`
  - `NOTION_TYPE_PROPERTY`
  - `NOTION_AUDIENCE_PROPERTY`
  - `NOTION_DESCRIPTION_PROPERTY`
  - `NOTION_PUBLISH_DATE_PROPERTY`
  - `CONTENT_DIR`
  - `NOTION_PAGE_SIZE`
  - `NOTION_MAX_RETRIES`
  - `DRY_RUN`
- From `.env.notion-sheets.example` + sheets workflow/script:
  - `NOTION_TOKEN`
  - `NOTION_VERSION`
  - `NOTION_DATA_SOURCE_ID`
  - `GOOGLE_SHEET_ID`
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `EXPECTED_GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `SYNC_OWNER`
  - `REVENUE_RANGE`
  - `BACKUP_RANGE`
  - `PAGE_SIZE`
  - `MAX_RETRIES`
  - `DRY_RUN`
  - `GOOGLE_SHEETS_ACCESS_TOKEN` (supported in script fallback path: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-to-sheets.mjs:L98-L99`)

### 4.6 `api/` routes or `scripts/` involved

- `api/`:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts`
    - `GET /notion-sync-runs` (`L179-L185`)
    - `POST /signups` waitlist submit path (`L412-L437`)
- `scripts/`:
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-content-sync.mjs`
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-to-sheets.mjs`
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/validate-notion-records.mjs`
  - `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/local-sheets-write-smoke.mjs` (local smoke utility; includes hard-coded local defaults)

---

## 5) Ordered migration checklist for CR8WDashVfin

1. [ ] Recreate a **public route surface** equivalent to current `App.tsx` public bypass semantics (`/content`, `/content/:slug`) before auth gate.  
       Source: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/App.tsx:L495-L497`.
2. [ ] Recreate waitlist UI behavior (copy, fields, CTA, “Team member? Sign in →”, success/error states).  
       Source behavior matches `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/app/components/LandingSignup.tsx@e23902a:L23-L39`.
3. [ ] Recreate waitlist submit API contract: `POST /signups` with server validation + case-insensitive dedupe-as-success.  
       Source: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L412-L437`.
4. [ ] Preserve waitlist storage semantics (or define explicit replacement): current storage is KV list under `cr8w_signups` in Supabase table `kv_store_8dcd9693`.  
       Source: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/api/server.ts:L40`, `L416`.
5. [ ] Port `PublicContent` routes and content-loading path (`content/*.mdx` + `src/lib/content.ts` audience filtering + Markdown renderer).  
       Sources: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/lib/content.ts:L15-L19`, `L84-L93`; `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PublicContent.tsx:L50-L127`.
6. [ ] Decide integration strategy for `PodcastView.tsx` in target typed payload architecture.  
       It is prop-driven (good) and does no direct fetching, but needs payload-provided episode/guest/topicDrop data and mutation handlers.  
       Sources: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/views/PodcastView.tsx:L4-L15`, `L131-L183`.
7. [ ] Port styling/assets required by public pages: global CSS class blocks and font loading.  
       Sources: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/src/styles/cr8w.css:L679-L970`; `/home/runner/work/CR8W_home_v3/CR8W_home_v3/index.html:L11-L13`.
8. [ ] Port or replace the Notion content sync pipeline (workflow + script + env contracts) if public content should keep publishing from Notion.  
       Sources: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/.github/workflows/notion-content-sync.yml:L1-L80`; `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-content-sync.mjs:L16-L47`, `L72-L85`, `L236-L275`.
9. [ ] Port or replace Notion→Sheets revenue mirror workflow only if operationally required in target repo.  
       Sources: `/home/runner/work/CR8W_home_v3/CR8W_home_v3/.github/workflows/notion-to-sheets.yml:L1-L61`; `/home/runner/work/CR8W_home_v3/CR8W_home_v3/scripts/notion-to-sheets.mjs:L5-L25`, `L169-L184`.
10. [ ] Build new equivalents in target repo for anything absent there today:
    - [ ] Public unauthenticated route exceptions
    - [ ] Waitlist frontend + `/signups` backend
    - [ ] `content/` + Notion content generation workflow
    - [ ] `templates/` artifacts (if still needed operationally)
