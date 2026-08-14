#!/usr/bin/env node
import crypto from 'node:crypto';

const required = ['NOTION_TOKEN', 'NOTION_DATA_SOURCE_ID', 'GOOGLE_SHEET_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

const notionVersion = process.env.NOTION_VERSION || '2025-09-03';
const sheetId = process.env.GOOGLE_SHEET_ID;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID.replace(/^collection:\/\//, '');
const dryRun = process.env.DRY_RUN === '1';
const revenueRange = process.env.REVENUE_RANGE || 'Revenue_Ops!A2:T';
const backupRange = process.env.BACKUP_RANGE || 'Backup_Log!A2:J';
const notionHeaders = { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': notionVersion, 'Content-Type': 'application/json' };

async function notionQuery() {
  const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, { method: 'POST', headers: notionHeaders, body: JSON.stringify({ page_size: 100 }) });
  if (!response.ok) throw new Error(`Notion query failed: ${response.status} ${await response.text()}`);
  return (await response.json()).results || [];
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
  return '';
}

function mapPage(page) {
  const p = page.properties || {};
  const row = [page.url || page.id, text(p.Organization), text(p.Owner), text(p['Contact Name']), text(p['Contact Email']), text(p['Actual Close']), text(p.Type), text(p['Linked Podcast Episode']), text(p.Created), text(p['Expected Close']), text(p.Currency), text(p['Linked Workshop ID']), text(p.Amount), text(p.Notes), text(p['Sync Status']), text(p.Stage), '', new Date().toISOString(), '', page.url || page.id];
  const hash = crypto.createHash('sha256').update(JSON.stringify(row.slice(0, 16))).digest('hex');
  row[16] = `${row[0]}|${row[8]}`;
  row[18] = hash;
  return { row, hash, url: row[0] };
}

async function googleAccessToken() {
  if (process.env.GOOGLE_SHEETS_ACCESS_TOKEN) return process.env.GOOGLE_SHEETS_ACCESS_TOKEN;
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error('Set GOOGLE_SHEETS_ACCESS_TOKEN or GOOGLE_SERVICE_ACCOUNT_JSON');
  const service = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: service.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  const assertion = `${header}.${payload}.${signer.sign(service.private_key, 'base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  return (await response.json()).access_token;
}

async function writeSheets(rows, backupRows) {
  const token = await googleAccessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: [{ range: revenueRange, majorDimension: 'ROWS', values: rows }, { range: backupRange, majorDimension: 'ROWS', values: backupRows }] }) });
  if (!response.ok) throw new Error(`Google Sheets write failed: ${response.status} ${await response.text()}`);
  return response.json();
}

const pages = await notionQuery();
const mapped = pages.map(mapPage);
const now = new Date().toISOString();
const backupRows = mapped.map(({ url, hash }) => [crypto.randomUUID(), now, 'Notion Revenue Ops', url, hash, 'UPSERT', process.env.SYNC_OWNER || 'automation', 'READY', '', 'Source snapshot written by recurring worker']);
const summary = { dryRun, records: mapped.length, source: `collection://${dataSourceId}`, target: sheetId, hashes: mapped.map((x) => x.hash) };
if (!dryRun) await writeSheets(mapped.map((x) => x.row), backupRows);
console.log(JSON.stringify(summary, null, 2));
