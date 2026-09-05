#!/usr/bin/env node
/**
 * Notion -> Supabase one-way mirror for Create Well OS.
 *
 * Contract (from the Create Well OS Backend Hub):
 *   Notion writes. Supabase remembers. cr8w.com reads. Nothing writes backward.
 *
 * This script NEVER writes to Notion. It only reads.
 *
 * Idempotent: upserts by Notion page id, so re-running is safe and cheap.
 * Resilient: retries 429/529 with exponential backoff + honors Retry-After.
 *
 * Env:
 *   NOTION_API_TOKEN            (required) internal integration token
 *   SUPABASE_URL                (required)
 *   SUPABASE_SERVICE_ROLE_KEY   (required) service role, server-side only
 *   NOTION_API_VERSION          (optional) default 2025-09-03
 *   DRY_RUN                     (optional) 1 = read Notion, skip all writes
 *
 * Usage:
 *   node scripts/notion-to-supabase.mjs
 *   DRY_RUN=1 node scripts/notion-to-supabase.mjs
 */

const NOTION_TOKEN = process.env.NOTION_API_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTION_VERSION = process.env.NOTION_API_VERSION || '2025-09-03';
const DRY_RUN = process.env.DRY_RUN === '1';

// Create Well OS data sources (the five databases, 2026-08-22 rebuild)
const SOURCES = {
  flows:  'c1677843-dd13-4e37-9f80-e960b26847dc',
  moves:  '5597e583-f7df-4f6c-90b0-296a26c57454',
  people: 'b97bcbdf-2b1b-488d-9d07-4012b031732e',
};

// ── guards ────────────────────────────────────────────────────────────────────
function requireEnv() {
  const missing = [];
  if (!NOTION_TOKEN) missing.push('NOTION_API_TOKEN');
  if (!DRY_RUN && !SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!DRY_RUN && !SUPABASE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ── retry with backoff (Notion documents 429 + 529 as slow-down signals) ──────
const MAX_RETRIES = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Errors that will never succeed on retry (bad token, bad request, not shared). */
class FatalHttpError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FatalHttpError';
    this.fatal = true;
  }
}

async function fetchWithRetry(url, options, label) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, options);

      // Retryable: Notion documents 429 (rate limit) and 529 (overloaded);
      // 5xx is transient server trouble.
      if (res.status === 429 || res.status === 529 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(2 ** attempt * 500, 16000) + Math.random() * 400;
        if (attempt === MAX_RETRIES) {
          throw new FatalHttpError(`${label}: ${res.status} after ${MAX_RETRIES} retries`);
        }
        console.warn(`  ${label}: ${res.status}, backing off ${Math.round(backoff)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(backoff);
        continue;
      }

      // Everything else non-ok is fatal: 401 bad token, 403 not shared with the
      // integration, 404 wrong id, 400 bad body. Retrying only wastes time.
      if (!res.ok) {
        const body = await res.text();
        throw new FatalHttpError(`${label}: ${res.status} ${body.slice(0, 400)}`);
      }

      return res;
    } catch (err) {
      if (err.fatal) throw err;
      lastErr = err;
      // network-level failure (DNS, socket reset): worth retrying
      if (attempt === MAX_RETRIES) break;
      const backoff = Math.min(2 ** attempt * 500, 16000);
      console.warn(`  ${label}: ${err.message}, retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

// ── Notion read ───────────────────────────────────────────────────────────────
async function queryDataSource(dataSourceId, label) {
  const rows = [];
  let cursor;

  do {
    const res = await fetchWithRetry(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
      },
      `notion ${label}`
    );

    const json = await res.json();
    rows.push(...(json.results || []));
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);

  return rows;
}

// ── property extractors ───────────────────────────────────────────────────────
const P = {
  title: (p) => p?.title?.map((t) => t.plain_text).join('') || null,
  text: (p) => p?.rich_text?.map((t) => t.plain_text).join('') || null,
  select: (p) => p?.select?.name || null,
  multi: (p) => (p?.multi_select || []).map((s) => s.name),
  number: (p) => (typeof p?.number === 'number' ? p.number : null),
  checkbox: (p) => Boolean(p?.checkbox),
  dateStart: (p) => p?.date?.start || null,
  dateEnd: (p) => p?.date?.end || null,
  relation: (p) => (p?.relation || []).map((r) => r.id),
  url: (p) => p?.url || null,
  uniqueId: (p) => (typeof p?.unique_id?.number === 'number' ? p.unique_id.number : null),
};

function mapFlow(page) {
  const p = page.properties || {};
  return {
    notion_id: page.id,
    notion_url: page.url,
    flow_id: P.uniqueId(p['ID']),
    name: P.title(p['Name']),
    type: P.select(p['Type']),
    status: P.select(p['Status']),
    date_start: P.dateStart(p['Date']),
    date_end: P.dateEnd(p['Date']),
    media_cutoff: P.dateStart(p['Media Cutoff']),
    flow_keeper: P.relation(p['Flow Keeper']),
    guests: P.relation(p['Guests']),
    support: P.relation(p['Support']),
    attended: P.relation(p['Attended']),
    venue: P.text(p['Venue']),
    capacity: P.number(p['Capacity']),
    is_public: P.checkbox(p['Public?']),
    hard_stop: P.text(p['Hard Stop']),
    notes: P.text(p['Notes']),
    retro: P.text(p['Retro']),
    drive_folder: P.url(p['Drive Folder']),
    notion_created: page.created_time,
    last_synced: new Date().toISOString(),
  };
}

function mapMove(page) {
  const p = page.properties || {};
  return {
    notion_id: page.id,
    notion_url: page.url,
    move_id: P.uniqueId(p['ID']),
    name: P.title(p['Name']),
    status: P.select(p['Status']),
    type: P.select(p['Type']),
    due: P.dateStart(p['Due']),
    owner: P.relation(p['Owner']),
    person: P.relation(p['Person']),
    flow: P.relation(p['Flow']),
    blocked_by: P.text(p['Blocked By']),
    notes: P.text(p['Notes']),
    notion_created: page.created_time,
    last_synced: new Date().toISOString(),
  };
}

function mapPerson(page) {
  const p = page.properties || {};
  return {
    notion_id: page.id,
    notion_url: page.url,
    person_id: P.uniqueId(p['ID']),
    name: P.title(p['Name']),
    roles: P.multi(p['Roles']),
    well_level: P.select(p['Well Level']),
    bench_stage: P.select(p['Bench Stage']),
    source: P.select(p['Source']),
    consent: P.multi(p['Consent']),
    consent_captured: P.dateStart(p['Consent Captured']),
    next_invitation: P.dateStart(p['Next Invitation']),
    handle: P.text(p['Handle']),
    role_text: P.text(p['Role']),
    notes: P.text(p['Notes']),
    notion_created: page.created_time,
    last_synced: new Date().toISOString(),
  };
}

// ── Supabase write ────────────────────────────────────────────────────────────
async function upsert(table, rows, conflictCol = 'notion_id') {
  if (!rows.length) return 0;
  if (DRY_RUN) {
    console.log(`  [dry-run] would upsert ${rows.length} into ${table}`);
    return rows.length;
  }

  // chunk to stay well under payload limits
  const CHUNK = 100;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    await fetchWithRetry(
      `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictCol}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(batch),
      },
      `supabase ${table}`
    );
    written += batch.length;
  }
  return written;
}

async function pruneDeleted(table, liveIds) {
  // Rows that vanished from Notion (deleted/archived) should leave the mirror.
  if (DRY_RUN || !liveIds.length) return 0;
  const list = liveIds.map((id) => `"${id}"`).join(',');
  const res = await fetchWithRetry(
    `${SUPABASE_URL}/rest/v1/${table}?notion_id=not.in.(${list})`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
    },
    `supabase prune ${table}`
  );
  const removed = await res.json().catch(() => []);
  return Array.isArray(removed) ? removed.length : 0;
}

async function logRun(fields) {
  if (DRY_RUN) return null;
  const res = await fetchWithRetry(
    `${SUPABASE_URL}/rest/v1/mirror_sync_runs`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([fields]),
    },
    'supabase sync_runs'
  );
  const [row] = await res.json();
  return row?.id || null;
}

async function finishRun(id, fields) {
  if (DRY_RUN || !id) return;
  await fetchWithRetry(
    `${SUPABASE_URL}/rest/v1/mirror_sync_runs?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(fields),
    },
    'supabase sync_runs finish'
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  requireEnv();
  const t0 = Date.now();
  console.log(`Notion -> Supabase mirror${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`Notion-Version: ${NOTION_VERSION}\n`);

  const runId = await logRun({ status: 'running' });

  try {
    console.log('Reading FLOWS...');
    const flowPages = await queryDataSource(SOURCES.flows, 'flows');
    const flows = flowPages.map(mapFlow);
    console.log(`  ${flows.length} rows`);

    console.log('Reading MOVES...');
    const movePages = await queryDataSource(SOURCES.moves, 'moves');
    const moves = movePages.map(mapMove);
    console.log(`  ${moves.length} rows`);

    console.log('Reading PEOPLE...');
    const peoplePages = await queryDataSource(SOURCES.people, 'people');
    const people = peoplePages.map(mapPerson);
    console.log(`  ${people.length} rows\n`);

    console.log('Upserting...');
    const wf = await upsert('mirror_flows', flows);
    const wm = await upsert('mirror_moves', moves);
    const wp = await upsert('mirror_people', people);
    console.log(`  flows=${wf} moves=${wm} people=${wp}`);

    console.log('Pruning rows deleted in Notion...');
    const pf = await pruneDeleted('mirror_flows', flows.map((r) => r.notion_id));
    const pm = await pruneDeleted('mirror_moves', moves.map((r) => r.notion_id));
    const pp = await pruneDeleted('mirror_people', people.map((r) => r.notion_id));
    console.log(`  pruned flows=${pf} moves=${pm} people=${pp}`);

    await finishRun(runId, {
      finished_at: new Date().toISOString(),
      status: 'ok',
      flows_count: flows.length,
      moves_count: moves.length,
      people_count: people.length,
    });

    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nDone in ${secs}s`);

    // GitHub Actions job summary
    if (process.env.GITHUB_STEP_SUMMARY) {
      const { appendFileSync } = await import('node:fs');
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        [
          '### Notion mirror sync',
          '',
          '| Table | Rows | Pruned |',
          '|---|---|---|',
          `| mirror_flows | ${flows.length} | ${pf} |`,
          `| mirror_moves | ${moves.length} | ${pm} |`,
          `| mirror_people | ${people.length} | ${pp} |`,
          '',
          `Completed in ${secs}s.`,
          '',
        ].join('\n')
      );
    }
  } catch (err) {
    console.error(`\nFAILED: ${err.message}`);
    await finishRun(runId, {
      finished_at: new Date().toISOString(),
      status: 'error',
      error: String(err.message).slice(0, 1000),
    });
    process.exit(1);
  }
}

main();
