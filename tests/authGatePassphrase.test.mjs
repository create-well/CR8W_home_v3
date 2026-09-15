import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

const authGate = await read('src/components/AuthGate.tsx');
const envExample = await read('.env.example');
const sop = await read('SOP.md');

test('AuthGate uses VITE_TEAM_PASSPHRASE and fails closed when unset', () => {
  assert.match(authGate, /import\.meta\.env\.VITE_TEAM_PASSPHRASE/);
  assert.match(authGate, /Configuration error: VITE_TEAM_PASSPHRASE is not set/);
  assert.match(authGate, /Wrong password/);
});

test('.env.example documents team passphrase variable', () => {
  assert.match(envExample, /VITE_TEAM_PASSPHRASE=/);
  assert.match(envExample, /set this in Vercel Preview and Production/);
});

test('no hardcoded passphrase remains in auth gate and SOP points to env config', () => {
  assert.doesNotMatch(authGate, /pass\s*!==\s*['"`][^'"`]+['"`]/);
  assert.match(sop, /VITE_TEAM_PASSPHRASE/);
});
