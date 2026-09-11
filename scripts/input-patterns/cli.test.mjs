import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checkInputPatterns} from './cli.mjs';

test('check fails closed for missing, corrupt and unsupported baselines', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kwilt-input-policy-'));
  try {
    assert.throws(() => checkInputPatterns(root));
    fs.mkdirSync(path.join(root, 'scripts/input-patterns'), {recursive: true});
    const file = path.join(root, 'scripts/input-patterns/baseline.json');
    fs.writeFileSync(file, '{');
    assert.throws(() => checkInputPatterns(root));
    fs.writeFileSync(file, JSON.stringify({version: 99, sites: [], exceptions: []}));
    assert.throws(() => checkInputPatterns(root), /Unsupported/);
    fs.writeFileSync(file, JSON.stringify({version: 1, sites: [], exceptions: []}));
    assert.deepEqual(checkInputPatterns(root).findings, []);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
