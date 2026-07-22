import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const fixturePath = path.join(root, 'protocol-fixtures/kwilt-unified-chat-v2.json');
const canonical = JSON.parse(readFileSync(fixturePath, 'utf8'));
assert.equal(canonical.protocolVersion, 2);
assert.equal(canonical.snapshot.context[0]?.version, 2);
assert.equal(canonical.snapshot.runs[0]?.canRetry, true);

const commonGitDir = path.resolve(root, execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim());
const kwiltRepo = path.dirname(commonGitDir);
const workspaceParent = path.dirname(kwiltRepo);
const lane = path.basename(root);
const companions = [
  {
    name: 'kwilt-site',
    fixture: path.join(workspaceParent, 'kwilt-site', '.worktrees', lane, 'protocol-fixtures/kwilt-unified-chat-v2.json'),
  },
  {
    name: 'Giraffed compatibility adapter',
    fixture: path.join(workspaceParent, 'Documents', 'Orchard-worktrees', 'shared-agent-workbench-extraction', 'protocol-fixtures/kwilt-unified-chat-v2.json'),
    adapter: path.join(workspaceParent, 'Documents', 'Orchard-worktrees', 'shared-agent-workbench-extraction', 'src/components/agent-workbench/kwilt-v2-compat.ts'),
  },
];
const requireCompanions = process.argv.includes('--require-companions');
for (const companion of companions) {
  if (!existsSync(companion.fixture)) {
    if (requireCompanions) throw new Error(`${companion.name} fixture is missing: ${companion.fixture}`);
    console.log(`skip ${companion.name}: companion checkout not present`);
    continue;
  }
  assert.deepEqual(JSON.parse(readFileSync(companion.fixture, 'utf8')), canonical, `${companion.name} fixture drifted`);
  if (companion.adapter) {
    assert.match(readFileSync(companion.adapter, 'utf8'), /adaptKwiltV2HostMessage/);
  }
  console.log(`ok ${companion.name}`);
}
console.log('ok Kwilt protocol v2 canonical fixture');
