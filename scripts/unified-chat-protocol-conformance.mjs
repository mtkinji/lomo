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
const matchingSiteLane = path.join(workspaceParent, 'kwilt-site', '.worktrees', lane);
const kwiltSiteRoot = process.env.KWILT_SITE_ROOT
  ? path.resolve(process.env.KWILT_SITE_ROOT)
  : existsSync(matchingSiteLane)
    ? matchingSiteLane
    : path.join(workspaceParent, 'kwilt-site');
const companions = [
  {
    name: 'kwilt-site',
    // A standalone Kwilt checkout (including CI) may not include the companion
    // repository. An explicitly selected checkout remains a strict contract.
    required: Boolean(process.env.KWILT_SITE_ROOT),
    root: kwiltSiteRoot,
    fixture: path.join(kwiltSiteRoot, 'protocol-fixtures/kwilt-unified-chat-v2.json'),
    renderer: path.join(kwiltSiteRoot, 'components', 'unified-chat', 'KwiltChatWorkbench.tsx'),
    protocol: path.join(kwiltSiteRoot, 'lib', 'unifiedChatProtocol.ts'),
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
    if (companion.required || requireCompanions) throw new Error(`${companion.name} fixture is missing: ${companion.fixture}`);
    console.log(`skip ${companion.name}: companion checkout not present`);
    continue;
  }
  assert.deepEqual(JSON.parse(readFileSync(companion.fixture, 'utf8')), canonical, `${companion.name} fixture drifted`);
  if (companion.renderer) {
    assert.equal(existsSync(companion.renderer), true, `${companion.name} renderer is missing: ${companion.renderer}`);
    const renderer = readFileSync(companion.renderer, 'utf8');
    assert.match(renderer, /resolveWorkbenchTimeline\(snapshot\)/, `${companion.name} renderer does not consume the canonical timeline`);
    assert.doesNotMatch(renderer, /snapshot\.evidence\.length|snapshot\.proposals\.map|snapshot\.receipts\.map/, `${companion.name} renderer still reconstructs chronology from artifact buckets`);
    assert.equal(existsSync(companion.protocol), true, `${companion.name} protocol parser is missing`);
    assert.match(readFileSync(companion.protocol, 'utf8'), /function isTimelineItem/, `${companion.name} protocol parser does not validate timeline items`);
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: companion.root, encoding: 'utf8' }).trim();
    console.log(`ok ${companion.name} renderer ${sha}`);
  }
  if (companion.adapter) {
    assert.match(readFileSync(companion.adapter, 'utf8'), /adaptKwiltV2HostMessage/);
  }
  console.log(`ok ${companion.name}`);
}
console.log('ok Kwilt protocol v2 canonical fixture');
