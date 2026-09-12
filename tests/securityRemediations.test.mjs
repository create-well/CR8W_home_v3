import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const textFilePattern = /\.(md|mjs|ts|tsx|js|jsx|yml|yaml|json)$/i;

function listTrackedTextFiles() {
  const out = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => textFilePattern.test(file))
    .filter((file) => file !== 'tests/securityRemediations.test.mjs');
}

test('tracked text content does not include known plaintext credential patterns', () => {
  const files = listTrackedTextFiles();
  const forbiddenPatterns = [
    /secret_[A-Za-z0-9]{8,}/,
    /ntn_[A-Za-z0-9]{8,}/,
  ];

  const matches = [];

  for (const relativePath of files) {
    const fullPath = path.join(repoRoot, relativePath);
    const content = readFileSync(fullPath, 'utf8');

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        matches.push(`${relativePath}: ${pattern}`);
      }
    }
  }

  assert.deepEqual(matches, []);
});

test('AuthGate is fail-closed and cannot grant local access', () => {
  const authGatePath = path.join(repoRoot, 'src/components/AuthGate.tsx');
  const content = readFileSync(authGatePath, 'utf8');
  const appPath = path.join(repoRoot, 'src/App.tsx');
  const appContent = readFileSync(appPath, 'utf8');

  assert.doesNotMatch(content, /localStorage\.setItem\(\s*['"]cr8w_profile['"]/);
  assert.doesNotMatch(content, /onAuthenticated\s*\(/);
  assert.doesNotMatch(content, /type=['"]password['"]/);
  assert.match(content, /server-issued session/i);
  assert.match(content, /access will remain closed/i);
  assert.doesNotMatch(appContent, /localStorage\.getItem\(\s*['"]cr8w_profile['"]/);
});

test('SOP no longer documents a shared dashboard password', () => {
  const sopPath = path.join(repoRoot, 'SOP.md');
  const content = readFileSync(sopPath, 'utf8');
  assert.doesNotMatch(content, /\|\s*\*\*Live Dashboard\*\*.*Password:/i);
});
