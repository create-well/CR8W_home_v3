import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const routes = await read('src/vfin/app/routes.ts');
const permissions = await read('src/vfin/lib/dashboardPermissions.ts');
const source = await read('src/vfin/app/pages/MoneyPage.tsx');
const decisions = await read('src/vfin/app/pages/DecisionsPage.tsx');
const system = await read('src/vfin/app/pages/SystemPage.tsx');
const shell = await read('src/vfin/app/RootLayout.tsx');
const viewShell = await read('src/vfin/app/components/ViewShell.tsx');

test('VFIN port preserves the seven dashboard routes', () => {
  for (const route of ['moves', 'care', 'flows', 'money', 'decisions', 'system']) {
    assert.match(routes, new RegExp(`path: ['"]${route}['"]`));
  }
  assert.match(routes, /index:\s*true/);
});

test('VFIN port includes shared shell and five-state ViewShell', () => {
  assert.match(shell, /SyncStatusBar/);
  assert.match(viewShell, /loading|empty|ready|stale|failed|restricted/);
});

test('VFIN port uses Source Flow language and includes Pia stewardship', () => {
  assert.match(source, /The Source|Source Flow/);
  assert.match(permissions, /pia|Pia/);
  assert.match(decisions, /Pia/);
});

test('VFIN port includes detailed Decisions and System surfaces', () => {
  assert.match(decisions, /Monica's Decision Queue/);
  assert.match(decisions, /Mark decided/);
  assert.match(system, /System Health/);
});
