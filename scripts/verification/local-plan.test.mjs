import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLocalPlan } from './local-plan.mjs';
import { buildVerificationPlan } from './plan.mjs';

const options = { base: 'origin/main', cacheDir: '/tmp/local-checks', workers: 2, exists: () => true };
const jestGate = (files, extra = {}) => buildLocalPlan(files, { ...options, ...extra }).commands.find(c => c.id === 'jest');

test('21 ordinary source files stay related locally while integration retains the full suite', () => {
  const files = Array.from({ length: 21 }, (_, i) => `src/features/example/f${i}.ts`);
  assert.ok(jestGate(files).args.includes('--findRelatedTests'));
  assert.ok(buildVerificationPlan(files, options.base).commands.some(c => c.command === 'npm test -- --runInBand'));
});

test('changed tests execute even when no production file changed', () => {
  const file = 'src/domain/recurrence.test.ts';
  const gate = jestGate([file]);
  assert.ok(gate.args.includes(file));
  assert.ok(gate.args.includes('--findRelatedTests'));
});

test('existing TypeScript script tests and sources participate in Jest selection', () => {
  for (const file of ['scripts/conversational-control-corpus.test.ts', 'scripts/conversational-control-corpus.ts']) {
    assert.ok(jestGate([file])?.args.includes(file), file);
  }
});

for (const file of ['jest.setup.ts', 'jest.config.js', 'babel.config.js', 'metro.config.js', 'package-lock.json', 'package.json', 'src/test/render.tsx']) {
  test(`shared runtime change selects full tests locally: ${file}`, () => {
    assert.ok(!jestGate([file, 'src/domain/other.ts']).args.includes('--findRelatedTests'));
  });
}

test('deleted source files force full tests because the current import graph cannot find former dependents', () => {
  assert.ok(!jestGate(['src/domain/removed.ts'], { exists: () => false }).args.includes('--findRelatedTests'));
});

test('paths containing shell syntax remain a single literal argument', () => {
  const file = 'src/domain/a $(touch nope) `x` "space".ts';
  assert.ok(jestGate([file]).args.includes(file));
  assert.equal(jestGate([file]).shell, undefined);
});

test('typechecks use separate incremental state without changing existing npm lint commands', () => {
  const gates = buildLocalPlan(['src/domain/recurrence.test.ts'], options).commands;
  const app = gates.find(c => c.id === 'types:app');
  const tests = gates.find(c => c.id === 'types:tests');
  assert.ok(app.args.includes('--incremental'));
  assert.ok(tests.args.includes('--incremental'));
  assert.notEqual(app.args.at(-1), tests.args.at(-1));
});

test('one worker uses serial mode; multiple workers use a bounded pool', () => {
  assert.ok(jestGate(['src/a.ts'], { workers: 1 }).args.includes('--runInBand'));
  assert.ok(jestGate(['src/a.ts'], { workers: 2 }).args.includes('--maxWorkers=2'));
});

test('new verification tooling always tests the protected planner as well', () => {
  const gates = buildLocalPlan(['scripts/verification/local-runner.mjs'], options).commands;
  assert.ok(gates.some(c => c.args.includes('test:verification')));
});

test('local documentation checks do not mutate the code map or duplicate chat lint', () => {
  const plan = buildLocalPlan(['docs/feature-briefs/foo.md', 'src/features/unifiedChat/foo.ts'], options);
  assert.ok(plan.commands.some(c => c.args.includes('product:lint')));
  assert.ok(!plan.commands.some(c => c.args.includes('chat:delivery-lint')));
  assert.ok(!plan.commands.some(c => c.args.includes('agent:map')));
  assert.ok(plan.manual.some(c => c.command === 'npm run agent:map'));
  assert.ok(plan.manual.some(c => c.command === 'npm run visual:compare'));
});

test('backend checks retain real execution instead of local result reuse', () => {
  const gates = buildLocalPlan(['supabase/functions/foo/index.ts'], options).commands;
  assert.equal(gates.find(c => c.args.includes('test:supabase-functions')).cacheable, false);
});
