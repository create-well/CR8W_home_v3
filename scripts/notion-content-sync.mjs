import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const NOTION_API = 'https://api.notion.com/v1';
const DEFAULT_NOTION_VERSION = '2025-09-03';
const MANIFEST_NAME = '.notion-sync-manifest.json';

function required(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function getConfig(env = process.env) {
  const outputDir = path.resolve(env.CONTENT_DIR || 'content');
  const allowedStatuses = (env.NOTION_PUBLISHED_STATUSES || 'Published')
    .split(',').map((value) => value.trim()).filter(Boolean);
  const token = required(env, 'NOTION_TOKEN');
  const legacyDatabaseId = env.NOTION_CONTENT_DB?.trim();
  const dataSourceId = env.NOTION_CONTENT_DATA_SOURCE_ID?.trim();
  const sourceId = (dataSourceId || legacyDatabaseId || '').replace(/^collection:\/\//, '');
  if (!sourceId) {
    throw new Error('Missing required environment variable: NOTION_CONTENT_DATA_SOURCE_ID or NOTION_CONTENT_DB');
  }
  const sourceKind = dataSourceId ? 'data_source' : 'database';
  return {
    token,
    sourceId,
    sourceKind,
    // `NOTION_CONTENT_DB` is supported for the original Perplexity Space script,
    // which used Notion’s pre-data-source database query endpoint.
    notionVersion: env.NOTION_VERSION?.trim() || (sourceKind === 'database' ? '2022-06-28' : DEFAULT_NOTION_VERSION),
    outputDir,
    allowedStatuses,
    statusProperty: env.NOTION_STATUS_PROPERTY?.trim() || 'Status',
    titleProperty: env.NOTION_TITLE_PROPERTY?.trim() || (sourceKind === 'database' ? 'Content Title' : 'Title'),
    slugProperty: env.NOTION_SLUG_PROPERTY?.trim() || 'Slug',
    typeProperty: env.NOTION_TYPE_PROPERTY?.trim() || 'Type',
    audienceProperty: env.NOTION_AUDIENCE_PROPERTY?.trim() || 'Audience',
    descriptionProperty: env.NOTION_DESCRIPTION_PROPERTY?.trim() || 'Description',
    pageSize: Math.min(Math.max(Number(env.NOTION_PAGE_SIZE || 100), 1), 100),
    maxRetries: Math.min(Math.max(Number(env.NOTION_MAX_RETRIES || 3), 0), 5),
    dryRun: env.DRY_RUN === '1' || env.DRY_RUN === 'true',
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function notionRequest(config, endpoint, init = {}) {
  let response;
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    response = await fetch(`${NOTION_API}${endpoint}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Notion-Version': config.notionVersion,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === config.maxRetries) break;
    const retryAfter = Number(response.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(1000 * 2 ** attempt, 8000));
  }
  if (!response.ok) throw new Error(`Notion API ${endpoint} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

export async function queryAllPages(config) {
  const pages = [];
  let cursor;
  do {
    const resource = config.sourceKind === 'database' ? 'databases' : 'data_sources';
    const payload = await notionRequest(config, `/${resource}/${config.sourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: config.pageSize, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    pages.push(...(payload.results || []));
    cursor = payload.has_more ? payload.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function richTextToString(items = []) {
  return items.map((item) => item.plain_text ?? item.text?.content ?? '').join('');
}

export function propertyValue(property) {
  if (!property) return '';
  switch (property.type) {
    case 'title': return richTextToString(property.title);
    case 'rich_text': return richTextToString(property.rich_text);
    case 'select': return property.select?.name || '';
    case 'multi_select': return (property.multi_select || []).map((item) => item.name).join(', ');
    case 'status': return property.status?.name || '';
    case 'date': return property.date?.start || '';
    case 'url': return property.url || '';
    case 'email': return property.email || '';
    case 'number': return property.number ?? '';
    case 'checkbox': return Boolean(property.checkbox);
    case 'created_time': return property.created_time || '';
    case 'last_edited_time': return property.last_edited_time || '';
    case 'people': return (property.people || []).map((person) => person.name || person.id).join(', ');
    case 'formula': return property.formula?.string ?? property.formula?.number ?? property.formula?.boolean ?? '';
    default: return '';
  }
}

function titleFromPage(page, config) {
  const props = page.properties || {};
  const configured = propertyValue(props[config.titleProperty]);
  if (configured) return configured.trim();
  const titleProp = Object.values(props).find((property) => property.type === 'title');
  return propertyValue(titleProp).trim() || 'Untitled';
}

function slugify(value) {
  const slug = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
  return slug || 'untitled';
}

function safeSlug(value, fallback) {
  const candidate = slugify(value || fallback);
  if (candidate === '.' || candidate === '..') throw new Error(`Unsafe slug: ${value}`);
  return candidate;
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''));
}

export function pageToFrontmatter(page, config) {
  const title = titleFromPage(page, config);
  const props = page.properties || {};
  const status = propertyValue(props[config.statusProperty]);
  const slug = safeSlug(propertyValue(props[config.slugProperty]), title);
  return {
    title,
    slug,
    type: propertyValue(props[config.typeProperty]),
    audience: propertyValue(props[config.audienceProperty]),
    description: propertyValue(props[config.descriptionProperty]),
    status,
    notionId: page.id,
    notionUrl: page.url || '',
    lastEdited: page.last_edited_time || '',
  };
}

function inlineText(annotations, text) {
  let value = text;
  if (annotations?.code) value = `\`${value.replaceAll('`', '\\`')}\``;
  if (annotations?.bold) value = `**${value}**`;
  if (annotations?.italic) value = `*${value}*`;
  if (annotations?.strikethrough) value = `~~${value}~~`;
  return annotations?.color && annotations.color !== 'default' ? value : value;
}

function richTextMarkdown(items = []) {
  return items.map((item) => inlineText(item.annotations, item.plain_text ?? item.text?.content ?? '')).join('');
}

function blockMarkdown(block, depth = 0) {
  const type = block.type;
  const data = block[type] || {};
  const indent = '  '.repeat(depth);
  switch (type) {
    case 'paragraph': return data.rich_text?.length ? `${indent}${richTextMarkdown(data.rich_text)}` : '';
    case 'heading_1': return `# ${richTextMarkdown(data.rich_text)}`;
    case 'heading_2': return `## ${richTextMarkdown(data.rich_text)}`;
    case 'heading_3': return `### ${richTextMarkdown(data.rich_text)}`;
    case 'bulleted_list_item': return `${indent}- ${richTextMarkdown(data.rich_text)}`;
    case 'numbered_list_item': return `${indent}1. ${richTextMarkdown(data.rich_text)}`;
    case 'to_do': return `${indent}- [${data.checked ? 'x' : ' '}] ${richTextMarkdown(data.rich_text)}`;
    case 'quote': return richTextMarkdown(data.rich_text).split('\n').map((line) => `> ${line}`).join('\n');
    case 'callout': return `> **${data.icon?.emoji || 'Note'}** ${richTextMarkdown(data.rich_text)}`;
    case 'divider': return '---';
    case 'code': return `\`\`\`${data.language || ''}\n${richTextMarkdown(data.rich_text)}\n\`\`\``;
    case 'image': {
      const source = data.type === 'external' ? data.external?.url : data.file?.url;
      return source ? `![${data.caption ? richTextMarkdown(data.caption) : ''}](${source})` : '';
    }
    case 'bookmark':
    case 'embed': return data.url ? `<${data.url}>` : '';
    case 'child_page': return `## ${data.title || 'Untitled'}`;
    case 'table_of_contents': return '';
    default: return '';
  }
}

async function fetchBlocks(config, blockId) {
  const blocks = [];
  let cursor;
  do {
    const payload = await notionRequest(config, `/blocks/${blockId}/children?page_size=${config.pageSize}${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ''}`);
    for (const block of payload.results || []) {
      blocks.push(block);
      if (block.has_children) blocks.push(...await fetchBlocks(config, block.id));
    }
    cursor = payload.has_more ? payload.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

export function renderMdx(frontmatter, blocks) {
  const metadata = [
    `title: ${yamlString(frontmatter.title)}`,
    `slug: ${yamlString(frontmatter.slug)}`,
    `type: ${yamlString(frontmatter.type)}`,
    `audience: ${yamlString(frontmatter.audience)}`,
    `description: ${yamlString(frontmatter.description)}`,
    `status: ${yamlString(frontmatter.status)}`,
    `notionId: ${yamlString(frontmatter.notionId)}`,
    `notionUrl: ${yamlString(frontmatter.notionUrl)}`,
    `lastEdited: ${yamlString(frontmatter.lastEdited)}`,
  ].join('\n');
  const body = blocks.map((block) => blockMarkdown(block)).filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return `---\n${metadata}\n---\n\n${body}\n`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readManifest(outputDir) {
  try { return JSON.parse(await fs.readFile(path.join(outputDir, MANIFEST_NAME), 'utf8')); }
  catch { return { files: [] }; }
}

async function writeFiles(config, records) {
  await fs.mkdir(config.outputDir, { recursive: true });
  const previous = await readManifest(config.outputDir);
  const nextFiles = [];
  for (const record of records) {
    const filename = `${record.frontmatter.slug}.mdx`;
    const destination = path.resolve(config.outputDir, filename);
    if (!destination.startsWith(`${config.outputDir}${path.sep}`)) throw new Error(`Refusing to write outside CONTENT_DIR: ${filename}`);
    await fs.writeFile(destination, record.content, 'utf8');
    nextFiles.push(filename);
  }
  const nextSet = new Set(nextFiles);
  for (const filename of previous.files || []) {
    if (!nextSet.has(filename)) await fs.rm(path.join(config.outputDir, filename), { force: true });
  }
  await fs.writeFile(path.join(config.outputDir, MANIFEST_NAME), `${JSON.stringify({ generatedAt: new Date().toISOString(), files: nextFiles }, null, 2)}\n`);
}

export async function main(env = process.env) {
  const config = getConfig(env);
  const pages = await queryAllPages(config);
  const published = pages.filter((page) => config.allowedStatuses.includes(propertyValue((page.properties || {})[config.statusProperty])));
  const records = [];
  for (const page of published) {
    const frontmatter = pageToFrontmatter(page, config);
    const blocks = await fetchBlocks(config, page.id);
    const content = renderMdx(frontmatter, blocks);
    records.push({ frontmatter, content, hash: sha256(content) });
  }
  const summary = {
    dryRun: config.dryRun,
    queried: pages.length,
    published: records.length,
    outputDir: config.outputDir,
    files: records.map((record) => ({ slug: record.frontmatter.slug, hash: record.hash })),
  };
  if (!config.dryRun) await writeFiles(config, records);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
