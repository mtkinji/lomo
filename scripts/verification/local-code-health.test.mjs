import assert from 'node:assert/strict';
import test from 'node:test';
import { makeRepo } from './test-repo.mjs';
import { readGitFiles, summarizeFiles } from '../code-health-lib.mjs';
import { readGitFilesBatched } from './local-code-health.mjs';

test('batched baseline produces the same code-health inputs and summary as the protected reader', t => {
  const { root, write, git } = makeRepo(t);
  write('src/space name.ts', '\nexport const unicode = "✓";\n\n');
  write('src/empty.ts', '   \n');
  write('docs/note.md', 'not code');
  write('ios/build/ignored.ts', 'ignored');
  git('add', '.');
  git('commit', '-qm', 'baseline variations');
  const expected = readGitFiles(root, 'HEAD');
  const actual = readGitFilesBatched(root, 'HEAD');
  assert.deepEqual(actual, expected);
  assert.deepEqual(summarizeFiles(actual), summarizeFiles(expected));
});

test('invalid code-health bases fail instead of skipping the ratchet', t => {
  const { root } = makeRepo(t);
  assert.throws(() => readGitFilesBatched(root, 'missing-ref'));
});

test('a baseline with no code is represented without inventing file content', t => {
  const { root, git } = makeRepo(t);
  git('rm', 'src/a.ts', 'src/b.ts');
  git('commit', '-qm', 'empty baseline');
  assert.deepEqual(readGitFilesBatched(root, 'HEAD'), []);
});
