#!/usr/bin/env node
import crypto from 'node:crypto';

const OPTIONS = {
  Owner: new Set(['Monny', 'Istorya', 'Take Home Studio', 'Unassigned']),
  Type: new Set(['sponsor', 'grant', 'donation', 'merch', 'ticket', 'other']),
  Currency: new Set(['USD', 'PHP', 'CAD', 'EUR', 'Other']),
  'Sync Status': new Set(['Pending', 'Synced', 'Error', 'Archived']),
  Stage: new Set(['prospect', 'pitched', 'negotiating', 'closed-won', 'closed-lost', 'paused']),
};

const REQUIRED = ['Organization', 'Owner', 'Type', 'Currency', 'Sync Status', 'Stage'];

function readText(property) {
  if (!property) return '';
  if (property.type === 'title') return property.title?.map(x => x.plain_text || '').join('') || '';
  if (property.type === 'rich_text') return property.rich_text?.map(x => x.plain_text || '').join('') || '';
  if (property.type === 'email') return property.email || '';
  if (property.type === 'select') return property.select?.name || '';
  if (property.type === 'number') return property.number ?? '';
  if (property.type === 'date') return property.date?.start || '';
  if (property.type === 'url') return property.url || '';
  if (property.type === 'created_time') return property.created_time || '';
  return '';
}

function normalizedRecord(page) {
  const p = page.properties || {};
  const pageId = String(page.id || '').replaceAll('-', '');
  const value = name => readText(p[name]);
  const record = {
    notion_page_id: page.id || '',
    organization: value('Organization').trim(),
    owner: value('Owner').trim(),
    contact_name: value('Contact Name').trim(),
    contact_email: value('Contact Email').trim().toLowerCase(),
    actual_close: value('Actual Close'),
    type: value('Type').trim(),
    linked_podcast_episode: value('Linked Podcast Episode').trim(),
    created: value('Created'),
    expected_close: value('Expected Close'),
    currency: value('Currency').trim(),
    linked_workshop_id: value('Linked Workshop ID'),
    amount: value('Amount'),
    notes: value('Notes').trim(),
    sync_status: value('Sync Status').trim(),
    stage: value('Stage').trim(),
    record_key: `rev_${pageId}`,
    internal_link: page.url || '',
  };
  const hashInput = [record.organization, record.owner, record.contact_name, record.contact_email, record.actual_close, record.type, record.linked_podcast_episode, record.created, record.expected_close, record.currency, record.linked_workshop_id, record.amount, record.notes, record.sync_status, record.stage];
  record.record_hash = crypto.createHash('sha256').update(JSON.stringify(hashInput)).digest('hex');
  return record;
}

export function validatePage(page) {
  const errors = [];
  const p = page.properties || {};
  for (const name of REQUIRED) {
    if (!p[name] || !readText(p[name]).trim()) errors.push(`missing required property: ${name}`);
  }
  const record = normalizedRecord(page);
  for (const [name, options] of Object.entries(OPTIONS)) {
    const value = readText(p[name]).trim();
    if (value && !options.has(value)) errors.push(`invalid ${name}: ${value}`);
  }
  if (!/^rev_[a-f0-9]{32}$/.test(record.record_key)) errors.push('invalid record_key');
  if (record.amount !== '' && (!Number.isFinite(Number(record.amount)) || Number(record.amount) < 0)) errors.push('amount must be a non-negative number');
  if (record.linked_workshop_id !== '' && !Number.isInteger(Number(record.linked_workshop_id))) errors.push('linked workshop ID must be an integer');
  if (record.contact_email && !/^\S+@\S+\.\S+$/.test(record.contact_email)) errors.push('contact email is not valid');
  return { valid: errors.length === 0, errors, record };
}

if (process.argv[1] && process.argv[1].endsWith('validate-notion-records.mjs')) {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node scripts/validate-notion-records.mjs <notion-pages.json>');
  const pages = JSON.parse(await import('node:fs/promises').then(fs => fs.readFile(input, 'utf8')));
  const results = pages.map(validatePage);
  console.log(JSON.stringify({ total: results.length, valid: results.filter(x => x.valid).length, invalid: results.filter(x => !x.valid).length, errors: results.flatMap(x => x.errors) }, null, 2));
}
