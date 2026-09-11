import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { collectChanges, selectFiles, fingerprint } from './local-state.mjs';
import { makeRepo } from './test-repo.mjs';

test('change collection includes untracked, staged, deleted, and both sides of a rename', t => {
  const { root, git, write } = makeRepo(t);
  git('mv', 'src/a.ts', 'src/renamed.ts');
  fs.unlinkSync(path.join(root, 'src/b.ts'));
  write('src/new.ts', 'new');
  assert.deepEqual(collectChanges(root, 'HEAD'), ['src/a.ts', 'src/b.ts', 'src/new.ts', 'src/renamed.ts']);
});

test('invalid base references fail instead of reporting no changes', t => {
  const { root } = makeRepo(t);
  assert.throws(() => collectChanges(root, 'missing-ref'));
});

test('directory scope reports other dirty work and can include explicit unchanged files', t => {
  const { root, write } = makeRepo(t);
  write('docs/new.md', 'new');
  const result = selectFiles(root, ['docs/new.md', 'src/a.ts'], ['src/b.ts'], ['src']);
  assert.deepEqual(result.files, ['src/a.ts', 'src/b.ts']);
  assert.deepEqual(result.omitted, ['docs/new.md']);
});

test('scope selection rejects typos, outside paths, and an empty scope', t => {
  const { root } = makeRepo(t);
  assert.throws(() => selectFiles(root, [], ['src/missing.ts'], []), /missing/i);
  assert.throws(() => selectFiles(root, [], ['../outside.ts'], []), /outside/i);
  assert.throws(() => selectFiles(root, [], [], ['docs']), /scope/i);
});

test('deleted explicit files remain selected', t => {
  const { root } = makeRepo(t);
  assert.deepEqual(selectFiles(root, ['src/deleted.ts'], ['src/deleted.ts'], []).files, ['src/deleted.ts']);
});

test('fingerprints include source, untracked fixtures, ignored env, dependencies, runtime environment, and base', t => {
  const { root, write } = makeRepo(t);
  const key = (env = { EXAMPLE: 'a' }, base = 'HEAD') => fingerprint(root, base, env);
  let before = key();
  assert.equal(before, key());
  for (const [file, value] of [['src/a.ts', 'changed'], ['fixtures/new.txt', 'fixture'], ['.env.local', 'PRIVATE=value'], ['node_modules/example/index.js', 'module.exports = 2']]) {
    write(file, value);
    const after = key();
    assert.notEqual(after, before, file);
    before = after;
  }
  assert.notEqual(key({ EXAMPLE: 'b' }), before);
  assert.throws(() => key({}, 'missing-base'));
});

test('changing an installed dependency invalidates even when size and mtime are restored', t => {
  const { root, write } = makeRepo(t);
  write('node_modules/example/index.js', 'one');
  const file = path.join(root, 'node_modules/example/index.js');
  const previous = fs.statSync(file);
  const before = fingerprint(root, 'HEAD', {});
  write('node_modules/example/index.js', 'two');
  fs.utimesSync(file, previous.atime, previous.mtime);
  assert.notEqual(fingerprint(root, 'HEAD', {}), before);
});

test('Git cache outputs do not invalidate source fingerprints', t => {
  const { root, write } = makeRepo(t);
  const before = fingerprint(root, 'HEAD', {});
  write('.git/kwilt-verification/report.json', '{}');
  assert.equal(fingerprint(root, 'HEAD', {}), before);
});
