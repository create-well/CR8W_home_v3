#!/usr/bin/env node
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const NOTION_TOKEN = process.env.NOTION_API_TOKEN;
const NOTION_DATA_SOURCE_ID = process.env.NOTION_CONTENT_DATA_SOURCE_ID;
const OUTPUT_DIR = process.env.NOTION_CONTENT_OUTPUT_DIR || 'content/generated';
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const NOTION_VERSION = process.env.NOTION_API_VERSION || '2025-09-03';

if (!NOTION_TOKEN || !NOTION_DATA_SOURCE_ID) {
  console.error('Missing NOTION_API_TOKEN or NOTION_CONTENT_DATA_SOURCE_ID.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
};

const text = (property) =>
  (property?.rich_text || property?.title || []).map((item) => item.plain_text).join('').trim();

const select = (property) => property?.select?.name || null;
const date = (property) => property?.date?.start || null;
const url = (property) => property?.url || null;

const slugify = (value) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function notion(pathname, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${pathname}`, { headers, ...options });
  if (!response.ok) throw new Error(`Notion ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.json();
}

async function queryPublishedPages() {
  const pages = [];
  let cursor;
  do {
    const body = {
      page_size: 100,
      filter: {
        and: [
          { property: 'Status', select: { equals: 'Published' } },
          { property: 'Audience', select: { equals: 'Public' } },
        ],
      },
      ...(cursor ? { start_cursor: cursor } : {}),
    };
    const result = await notion(`/data_sources/${NOTION_DATA_SOURCE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    pages.push(...(result.results || []));
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);
  return pages;
}

async function pageBody(pageId) {
  const blocks = await notion(`/blocks/${pageId}/children?page_size=100`);
  return (blocks.results || [])
    .map((block) => {
      const value = block[block.type];
      const valueText = (value?.rich_text || []).map((item) => item.plain_text).join('').trim();
      if (!valueText) return '';
      if (block.type === 'heading_1') return `# ${valueText}`;
      if (block.type === 'heading_2') return `## ${valueText}`;
      if (block.type === 'heading_3') return `### ${valueText}`;
      if (block.type === 'bulleted_list_item') return `- ${valueText}`;
      if (block.type === 'numbered_list_item') return `1. ${valueText}`;
      return valueText;
    })
    .filter(Boolean)
    .join('

');
}

async function main() {
  const pages = await queryPublishedPages();
  const generated = [];

  for (const page of pages) {
    const properties = page.properties || {};
    const title = text(properties.Name) || 'Untitled';
    const slug = slugify(title) || page.id.replaceAll('-', '');
    const copy = text(properties.Copy);
    const body = copy || await pageBody(page.id);
    const document = `---
title: ${JSON.stringify(title)}
slug: ${JSON.stringify(slug)}
notionId: ${JSON.stringify(page.id)}
contentType: ${JSON.stringify(select(properties['Content Type']))}
publishDate: ${JSON.stringify(date(properties['Publish Date']))}
assetUrl: ${JSON.stringify(url(properties['URL']))}
assetSource: ${JSON.stringify(select(properties.Where))}
lastEdited: ${JSON.stringify(page.last_edited_time)}
seoTitle: ${JSON.stringify(title)}
seoDescription: ${JSON.stringify(copy.slice(0, 160))}
---

${body}
`;
    generated.push({ path: `${slug}.mdx`, content: document });
  }

  if (DRY_RUN) {
    console.log(JSON.stringify({ mode: 'dry-run', count: generated.length, files: generated.map((item) => item.path) }, null, 2));
    return;
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const file of generated) await writeFile(path.join(OUTPUT_DIR, file.path), file.content);
  await writeFile(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: generated.length, files: generated.map((item) => item.path) }, null, 2) + '
');
  console.log(`Generated ${generated.length} public content file(s) in ${OUTPUT_DIR}.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
