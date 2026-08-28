import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  renderConversationalParityJson,
  renderConversationalParityMarkdown,
  summarizeConversationalParity,
} from './conversational-control-parity.mjs';

const rows = [
  {
    operationId: 'todos.read', owner: 'todos', surfaceId: 'todos', intentId: 'todos.read',
    completionMode: 'direct', mobile: 'ready', phone: 'ready', external: 'ready',
    voice: 'shared_runtime', proofPaths: ['todos.test.ts'],
  },
  {
    operationId: 'games.open', owner: 'games', surfaceId: 'games', intentId: 'games.open',
    completionMode: 'excluded', mobile: 'excluded', phone: 'excluded', external: 'excluded',
    voice: 'excluded', proofPaths: ['games.test.ts'],
  },
];

test('summarizes every parity dimension from one row projection', () => {
  assert.deepEqual(summarizeConversationalParity(rows), {
    operations: 2,
    completionModes: { direct: 1, excluded: 1 },
    mobile: { ready: 1, excluded: 1 },
    phone: { ready: 1, excluded: 1 },
    external: { ready: 1, excluded: 1 },
    voice: { shared_runtime: 1, excluded: 1 },
  });
});

test('renders Markdown and JSON from the same projected rows', () => {
  const summary = summarizeConversationalParity(rows);
  const json = JSON.parse(renderConversationalParityJson({ rows, errors: [], summary }));
  const markdown = renderConversationalParityMarkdown({ rows, errors: [], summary });

  assert.deepEqual(json.rows, rows);
  assert.deepEqual(json.summary, summary);
  assert.match(markdown, /\| `todos\.read` \| todos \| direct \| ready \| ready \| ready \| shared_runtime \|/);
  assert.match(markdown, /Operations \| 2/);
  assert.match(markdown, /Final parity errors \| 0/);
});

test('allows an incomplete baseline only with the explicit flag', () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const script = path.join(scriptDir, 'conversational-control-parity.mjs');
  const allowed = spawnSync(process.execPath, [script, '--allow-incomplete', '--no-write'], {
    cwd: path.resolve(scriptDir, '..'), encoding: 'utf8',
  });
  const enforced = spawnSync(process.execPath, [script, '--no-write'], {
    cwd: path.resolve(scriptDir, '..'), encoding: 'utf8',
  });

  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(enforced.status, 1, enforced.stderr);
  assert.match(enforced.stdout, /Final parity errors \| [1-9]\d*/);
});
