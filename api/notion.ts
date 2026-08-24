// Server-only Notion client for CR8W v3.
// The token is read from the environment and never falls back to a literal.
// Nothing in this file may be imported by client code under src/.

const NOTION_VERSION = '2022-06-28';
const API = 'https://api.notion.com/v1';

export const DATA_SOURCES = {
  flows: process.env.NOTION_FLOWS_DB ?? '',
  moves: process.env.NOTION_MOVES_DB ?? '',
  people: process.env.NOTION_PEOPLE_DB ?? '',
} as const;

export type SourceName = keyof typeof DATA_SOURCES;

export function tokenPresent(): boolean {
  return Boolean(process.env.NOTION_TOKEN);
}

function token(): string {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new Error('NOTION_TOKEN is not configured');
  return t;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(
  path: string,
  init: { method?: string; body?: unknown } = {},
  attempt = 0,
): Promise<any> {
  const MAX_ATTEMPTS = 6;
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  if (res.ok) return res.json();

  const retryable = res.status === 429 || res.status >= 500;
  if (retryable && attempt < MAX_ATTEMPTS) {
    const header = Number(res.headers.get('retry-after'));
    const wait =
      Number.isFinite(header) && header > 0
        ? header * 1000
        : Math.min(2 ** attempt * 500 + Math.random() * 250, 30_000);
    await sleep(wait);
    return request(path, init, attempt + 1);
  }

  const detail = await res.text();
  throw new Error(`Notion ${res.status} on ${path}: ${detail.slice(0, 300)}`);
}

export async function queryAll(
  dataSourceId: string,
  filter?: unknown,
  sorts?: unknown,
): Promise<any[]> {
  if (!dataSourceId) throw new Error('Data source id is not configured');
  const out: any[] = [];
  let cursor: string | undefined;

  do {
    const data = await request(`/databases/${dataSourceId}/query`, {
      method: 'POST',
      body: {
        page_size: 100,
        ...(filter ? { filter } : {}),
        ...(sorts ? { sorts } : {}),
        ...(cursor ? { start_cursor: cursor } : {}),
      },
    });
    out.push(...(data.results ?? []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return out;
}

export async function createPage(dataSourceId: string, properties: unknown): Promise<any> {
  if (!dataSourceId) throw new Error('Data source id is not configured');
  return request('/pages', {
    method: 'POST',
    body: { parent: { database_id: dataSourceId }, properties },
  });
}

// ── Property readers ─────────────────────────────────────────────────────────

export function readTitle(page: any, name: string): string {
  return page?.properties?.[name]?.title?.[0]?.plain_text ?? '';
}

export function readText(page: any, name: string): string {
  return page?.properties?.[name]?.rich_text?.[0]?.plain_text ?? '';
}

export function readSelect(page: any, name: string): string | null {
  return page?.properties?.[name]?.select?.name ?? null;
}

export function readDate(page: any, name: string): string | null {
  return page?.properties?.[name]?.date?.start ?? null;
}

export function readNumber(page: any, name: string): number | null {
  const v = page?.properties?.[name]?.number;
  return typeof v === 'number' ? v : null;
}

export function readCheckbox(page: any, name: string): boolean {
  return page?.properties?.[name]?.checkbox === true;
}

export function readRelationCount(page: any, name: string): number {
  const rel = page?.properties?.[name]?.relation;
  return Array.isArray(rel) ? rel.length : 0;
}
