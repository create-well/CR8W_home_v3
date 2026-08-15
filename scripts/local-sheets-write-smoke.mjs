import { writeSheets } from './notion-to-sheets.mjs';
import fs from 'node:fs';
const keyPath = process.env.GOOGLE_KEY_PATH || '/home/ubuntu/Downloads/cr8w-505503-a87c22557be3.json';
const env = {
  NOTION_TOKEN: 'local-write-smoke-placeholder',
  NOTION_DATA_SOURCE_ID: 'd029c5b2-5473-8356-bd35-07c8e713e2c1',
  GOOGLE_SHEET_ID: '1GBOY57tM-5h-HfHoGllsbnZGv9tgqlNvjvHQW5RVTdA',
  GOOGLE_SERVICE_ACCOUNT_JSON: fs.readFileSync(keyPath, 'utf8'),
  REVENUE_RANGE: 'Revenue_Ops!A2:T',
  BACKUP_RANGE: 'Backup_Log!A2:J',
  SYNC_OWNER: 'mb@tablante.com',
};
const result = await writeSheets([], [], env);
console.log(JSON.stringify({ ok: true, updated: result.updatedRange || null, updatedRows: result.totalUpdatedRows ?? null, updatedCells: result.totalUpdatedCells ?? null }, null, 2));
