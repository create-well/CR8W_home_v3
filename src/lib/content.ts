export type SyncedContent = {
  title: string;
  slug: string;
  type: string;
  audience: string;
  description: string;
  notionPageId: string;
  syncedAt: string;
  body: string;
};

type Frontmatter = Record<string, string>;

const rawContentModules = import.meta.glob('../../content/*.mdx', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function unquote(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }

  return trimmed;
}

export function parseSyncedContent(raw: string, sourcePath = ''): SyncedContent | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1].split(/\r?\n/).reduce<Frontmatter>((fields, line) => {
    const separator = line.indexOf(':');
    if (separator < 1) return fields;

    const key = line.slice(0, separator).trim();
    fields[key] = unquote(line.slice(separator + 1));
    return fields;
  }, {});

  const fallbackSlug = sourcePath
    .split('/')
    .pop()
    ?.replace(/\.mdx$/, '')
    .trim();
  const slug = frontmatter.slug || fallbackSlug || '';

  if (!frontmatter.title || !slug) return null;

  return {
    title: frontmatter.title,
    slug,
    type: frontmatter.type || 'Field Note',
    audience: frontmatter.audience || 'Public',
    description: frontmatter.description || '',
    notionPageId: frontmatter.notionId || frontmatter.notion_page_id || '',
    syncedAt: frontmatter.lastEdited || frontmatter.synced_at || '',
    body: match[2].trim(),
  };
}

function compareContent(a: SyncedContent, b: SyncedContent): number {
  const aDate = Date.parse(a.syncedAt);
  const bDate = Date.parse(b.syncedAt);

  if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) {
    return bDate - aDate;
  }

  return a.title.localeCompare(b.title);
}

const syncedContent = Object.entries(rawContentModules)
  .map(([sourcePath, raw]) => parseSyncedContent(raw, sourcePath))
  .filter((item): item is SyncedContent => Boolean(item))
  .filter((item) => item.audience.trim().toLowerCase() === 'public')
  .sort(compareContent);

export function getPublicContent(): SyncedContent[] {
  return syncedContent;
}

export function getPublicContentBySlug(slug: string): SyncedContent | undefined {
  return syncedContent.find((item) => item.slug === slug);
}
