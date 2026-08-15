#!/usr/bin/env node
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

function getConfig(env = process.env) {
  const required = ['NOTION_TOKEN', 'NOTION_DATA_SOURCE_ID', 'GOOGLE_SHEET_ID'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  return {
    notionHeaders: {
      Authorization: 'Bearer ' + env.NOTION_TOKEN,
      'Notion-Version': env.NOTION_VERSION || '2025-09-03',
      'Content-Type': 'application/json',
    },
    sheetId: env.GOOGLE_SHEET_ID,
    dataSourceId: env.NOTION_DATA_SOURCE_ID.replace(/^collection:\/\//, ''),
    dryRun: env.DRY_RUN === '1',
    revenueRange: env.REVENUE_RANGE || 'Revenue_Ops!A2:T',
    backupRange: env.BACKUP_RANGE || 'Backup_Log!A2:J',
    syncOwner: env.SYNC_OWNER?.trim() || '',
    expectedServiceAccountEmail: env.EXPECTED_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '',
    pageSize: Math.min(Math.max(Number(env.PAGE_SIZE || 100), 1), 100),
    maxRetries: Math.min(Math.max(Number(env.MAX_RETRIES || 3), 0), 5),
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function notionQuery(config) {
  const pages = [];
  let cursor;
  do {
    const body = { page_size: config.pageSize, ...(cursor ? { start_cursor: cursor } : {}) };
    let response;
    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      response = await fetch(`https://api.notion.com/v1/data_sources/${config.dataSourceId}/query`, {
        method: 'POST',
        headers: config.notionHeaders,
        body: JSON.stringify(body),
      });
      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === config.maxRetries) break;
      await wait(Math.min(1000 * 2 ** attempt, 8000));
    }
    if (!response.ok) throw new Error(`Notion query failed: ${response.status} ${await response.text()}`);
    const payload = await response.json();
    pages.push(...(payload.results || []));
    cursor = payload.has_more ? payload.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function text(property) {
  if (!property) return '';
  if (property.type === 'title') return property.title?.map((x) => x.plain_text).join('') || '';
  if (property.type === 'rich_text') return property.rich_text?.map((x) => x.plain_text).join('') || '';
  if (property.type === 'email') return property.email || '';
  if (property.type === 'number') return property.number ?? '';
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'date') return property.date?.start || '';
  if (property.type === 'created_time') return property.created_time || '';
  if (property.type === 'url') return property.url || '';
  return '';
}

function mapPage(page) {
  const p = page.properties || {};
  const pageId = String(page.id || '');
  const recordKey = `rev_${pageId.replaceAll('-', '')}`;
  const values = [
    pageId,
    text(p.Organization).trim(),
    text(p.Owner).trim(),
    text(p['Contact Name']).trim(),
    text(p['Contact Email']).trim().toLowerCase(),
    text(p['Actual Close']),
    text(p.Type).trim(),
    text(p['Linked Podcast Episode']).trim(),
    text(p.Created),
    text(p['Expected Close']),
    text(p.Currency).trim(),
    text(p['Linked Workshop ID']),
    text(p.Amount),
    text(p.Notes).trim(),
    text(p['Sync Status']).trim(),
    text(p.Stage).trim(),
    recordKey,
    new Date().toISOString(),
    '',
    page.url || pageId,
  ];
  const hashInput = values.slice(1, 16);
  const hash = crypto.createHash('sha256').update(JSON.stringify(hashInput)).digest('hex');
  values[18] = hash;
  return { row: values, hash, url: values[19], recordKey };
}

export async function googleAccessToken(env = process.env, subject = '') {
  if (env.GOOGLE_SHEETS_ACCESS_TOKEN && !subject) return env.GOOGLE_SHEETS_ACCESS_TOKEN;
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Set GOOGLE_SHEETS_ACCESS_TOKEN or GOOGLE_SERVICE_ACCOUNT_JSON');
  let service;
  try {
    service = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  if (!service.client_email || !service.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key');
  const expected = env.EXPECTED_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  if (expected && service.client_email !== expected) {
    throw new Error(`Google service-account identity mismatch: expected ${expected}, received ${service.client_email}`);
  }
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: service.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    ...(subject ? { sub: subject } : {}),
  })).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  const assertion = `${header}.${payload}.${signer.sign(service.private_key, 'base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}

async function sheetsBatchUpdate(config, rows, backupRows, token) {
  return fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: config.revenueRange, majorDimension: 'ROWS', values: rows },
        { range: config.backupRange, majorDimension: 'ROWS', values: backupRows },
      ],
    }),
  });
}

async function writeSheetsWithConfig(config, rows, backupRows, env = process.env) {
  let response = await sheetsBatchUpdate(config, rows, backupRows, await googleAccessToken(env));
  if (response.ok) return response.json();

  const firstFailure = await response.text();
  if (response.status === 403 && config.syncOwner) {
    response = await sheetsBatchUpdate(config, rows, backupRows, await googleAccessToken(env, config.syncOwner));
    if (response.ok) return response.json();
    throw new Error(`Google Sheets write failed after retry: ${response.status} ${await response.text()}`);
  }

  throw new Error(`Google Sheets write failed: ${response.status} ${firstFailure}`);
}

export async function writeSheets(rows, backupRows, env = process.env) {
  return writeSheetsWithConfig(getConfig(env), rows, backupRows, env);
}

export async function main(env = process.env) {
  const config = getConfig(env);
  const pages = await notionQuery(config);
  const mapped = pages.map(mapPage);
  const now = new Date().toISOString();
  const backupRows = mapped.map(({ url, hash, recordKey }) => [crypto.randomUUID(), now, 'Notion Revenue Ops', url, recordKey, 'UPSERT', config.syncOwner || 'automation', 'READY', '', `Record hash ${hash}`]);
  const summary = {
    dryRun: config.dryRun,
    records: mapped.length,
    source: `collection://${config.dataSourceId}`,
    target: config.sheetId,
    hashes: mapped.map((x) => x.hash),
  };
  if (!config.dryRun) await writeSheetsWithConfig(config, mapped.map((x) => x.row), backupRows, env);
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
