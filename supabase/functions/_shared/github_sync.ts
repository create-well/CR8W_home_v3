export type SyncTableConfig = {
  format: 'json' | 'md' | 'mdx' | 'yaml';
  path: string;
  direction: 'db_to_github' | 'github_to_db' | 'bidirectional';
  conflictPolicy: 'db_wins' | 'github_wins' | 'manual';
  contentField?: string;
};

export type GitHubSyncConfig = {
  repo: string;
  branch: string;
  basePath: string;
  tables: Record<string, SyncTableConfig>;
};

export const DEFAULT_CONFIG: GitHubSyncConfig = {
  repo: 'create-well/CR8W_home_v3',
  branch: 'main',
  basePath: 'content',
  tables: {
    well_notes: { format: 'md', path: 'wells/notes/{id}.md', direction: 'bidirectional', conflictPolicy: 'manual', contentField: 'content' },
    tasks: { format: 'json', path: 'tasks/{status}/{id}.json', direction: 'bidirectional', conflictPolicy: 'manual' },
    topic_drops: { format: 'md', path: 'podcast/topic-drops/{id}.md', direction: 'bidirectional', conflictPolicy: 'manual', contentField: 'text' },
    episodes: { format: 'json', path: 'podcast/episodes/ep-{episode_num}.json', direction: 'bidirectional', conflictPolicy: 'manual' },
    guests: { format: 'json', path: 'podcast/guests/{id}.json', direction: 'bidirectional', conflictPolicy: 'manual' },
    workshops: { format: 'json', path: 'workshops/{id}.json', direction: 'bidirectional', conflictPolicy: 'manual' },
    revenue_ops: { format: 'json', path: 'revenue/{id}.json', direction: 'bidirectional', conflictPolicy: 'manual' }
  }
};

export function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc: Record<string, unknown>, key) => {
      acc[key] = sortKeys(value[key]);
      return acc;
    }, {});
  }
  return value;
}

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function interpolatePath(template: string, row: Record<string, any>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => sanitizePathPart(String(row[key] ?? row.id ?? 'unknown')));
}

function sanitizePathPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

export function serializeRow(tableName: string, row: Record<string, any>, config: SyncTableConfig): string {
  if (config.format === 'json') return stableJson({ sync_table: tableName, id: String(row.id), payload: row });
  const contentField = config.contentField || 'content';
  const body = String(row[contentField] ?? '');
  const frontmatter = stableJson({ sync_table: tableName, id: String(row.id), payload: { ...row, [contentField]: undefined } });
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

export async function githubFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers
    }
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json();
}
