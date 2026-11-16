import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createCategorySettingsRepository } from '../../../src/capabilities/money/data/categorySettingsRepository';
import { createMoneyCategorySettingsCommand } from '../../../src/capabilities/money/runtime/moneyCategorySettingsCommand';
import type { CategorySettingsRequest } from '../../../src/capabilities/money/domain/categorySettingsCommand';

async function main() {
const base = 'http://127.0.0.1:8082';
async function session(actor = 'owner') {
  const identity = await fetch(`${base}/fixture/session?actor=${actor}`).then(r => r.json());
  const client = createClient(base, 'synthetic-fixture-key', {
    global: { headers: { Authorization: `Bearer ${identity.token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { ...identity, client, remote: createCategorySettingsRepository(client) };
}
const owner = await session();
async function rows() {
  const [categories, plans] = await Promise.all([owner.client.from('budget_categories').select('*'), owner.client.from('budget_plans').select('*')]);
  assert.equal(categories.error, null); assert.equal(plans.error, null);
  return { category: categories.data![0], plan: plans.data![0] };
}
const makeRequest = async (name: string): Promise<CategorySettingsRequest> => {
  const { category, plan } = await rows();
  return { schemaVersion: 1, actorUserId: owner.actorUserId, categoryId: owner.categoryId, requestId: randomUUID(),
    expectedCategoryUpdatedAt: category.updated_at, expectedPlanUpdatedAt: plan.updated_at,
    settings: { name, budgetCents: 25000, fundingRhythm: 'monthly', rolloverEnabled: true,
      rolloverPolicy: { startMonth: '2026-01', startingBalanceCents: 1000, monthlyAmounts: { '2026-01': 25000 }, timeZone: 'UTC' },
      planRole: 'protected', expectedNeedCents: null, expectedNeedDueMonth: null }, governance: null };
};
const saved = new Map<string, CategorySettingsRequest>();
const key = (actor: string, category: string) => `${actor}:${category}`;
const journal = {
  load: async (actor: string, category: string) => saved.get(key(actor, category)) ?? null,
  save: async (request: CategorySettingsRequest) => { saved.set(key(request.actorUserId, request.categoryId), structuredClone(request)); },
  remove: async (actor: string, category: string) => { saved.delete(key(actor, category)); },
};
const count = async () => (await fetch(`${base}/fixture/receipt-count`).then(r => r.json())).count;
const control = async (action: string) => { assert.equal((await fetch(`${base}/fixture/control`, { method: 'POST', body: JSON.stringify({ action }) })).status, 200); };
await control('recover');
const before = await count();
const command = createMoneyCategorySettingsCommand(journal, owner.remote);
const first = await makeRequest('Native API saved together');
const results = await Promise.all([command.execute(first), command.execute(first)]);
assert.equal(results[0].outcome, 'confirmed'); assert.deepEqual(results[0], results[1]);
assert.equal(await count(), before + 1);
let data = await rows();
assert.equal(data.category.name, first.settings.name); assert.equal(data.plan.base_budget_cents, 25000);
assert.equal(data.plan.plan_role, 'protected'); assert.equal(data.plan.rollover_enabled, true);
assert.equal(data.plan.rollover_policy.startingBalanceCents, 1000);
console.log('PASS: signed JWT / PostgREST / production repository and command save all settings; concurrent taps create one receipt.');

const lost = await makeRequest('Committed despite lost response');
await control('lose-response');
assert.equal((await command.execute(lost)).outcome, 'unknown');
assert.equal(saved.size, 1); assert.equal(await count(), before + 2);
await control('recover');
const reopenedCommand = createMoneyCategorySettingsCommand(journal, owner.remote);
const recovered = await reopenedCommand.execute(lost);
assert.equal(recovered.outcome, 'confirmed'); assert.equal(await count(), before + 2); assert.equal(saved.size, 0);
assert.equal((await rows()).category.name, lost.settings.name);
assert.equal((await owner.remote.findOperation(owner.actorUserId, lost.requestId))?.request.requestId, lost.requestId);
console.log('PASS: committed response loss remains unknown while offline; reopened command recovers original receipt without a duplicate write.');

const stale = { ...first, requestId: randomUUID(), settings: { ...first.settings, name: 'Must not overwrite' } };
assert.equal((await command.execute(stale)).outcome, 'rejected');
assert.equal((await rows()).category.name, lost.settings.name);
assert.equal((await command.execute(stale)).outcome, 'rejected');
assert.equal(await count(), before + 3);
console.log('PASS: stale edit rejection is durable and cannot overwrite the confirmed category.');

const adult = await session('adult');
const adultRows = await adult.client.from('budget_categories').select('*');
assert.equal(adultRows.data?.length, 1);
const adultRequest = { ...await makeRequest('Adult confirmed'), actorUserId: adult.actorUserId };
assert.equal((await createMoneyCategorySettingsCommand(journal, adult.remote).execute(adultRequest)).outcome, 'confirmed');
for (const role of ['child', 'other']) {
  const identity = await session(role);
  const visible = await identity.client.from('budget_categories').select('*');
  assert.equal(visible.data?.length, 0, role);
  const rejected = await identity.remote.send({ ...await makeRequest('Unauthorized'), actorUserId: identity.actorUserId });
  assert.equal(rejected.outcome, 'rejected', role);
}
const anonymous = await session('anonymous');
assert.equal((await anonymous.client.from('budget_categories').select('*')).data?.length, 0);
const deniedAnonymous = await anonymous.client.rpc('save_budget_category_settings', {
  p_expected_actor_user_id: anonymous.actorUserId, p_request_id: randomUUID(), p_category_id: owner.categoryId,
  p_expected_category_updated_at: first.expectedCategoryUpdatedAt, p_expected_plan_updated_at: first.expectedPlanUpdatedAt,
  p_settings: first.settings, p_governance: null,
});
assert.equal(deniedAnonymous.error?.code, '42501');
const invalid = await fetch(`${base}/rest/v1/budget_categories?select=id`, { headers: { Authorization: 'Bearer invalid-fixture-token' } });
assert.equal(invalid.status, 401);
console.log('PASS: household adult can read/save; child, unrelated and anonymous users cannot; invalid JWT is denied.');
await control('enable-governance');
try {
  const original = await rows();
  const originalCounts = await fetch(`${base}/fixture/receipt-count`).then(r => r.json());
  const governed = await makeRequest('Must roll back late failure');
  governed.settings = { ...governed.settings, budgetCents: 30000, planRole: 'flexible', rolloverEnabled: false, rolloverPolicy: null };
  // Deliberately invalid receipt outcome fails its SQL constraint after category,
  // plan and version writes begin, matching the isolated SQL regression.
  governed.governance = {
    expectedActiveVersionId: null,
    candidate: { periodId: new Date().toISOString().slice(0, 7), status: 'ready', livingPercent: 70,
      resourceBasisCents: 100000, targetCents: 70000, plannedCents: 30000, unassignedCents: 40000,
      overTargetCents: 0, candidateHash: `api-${randomUUID()}`, evidenceHash: 'fixture-evidence', allocatorVersion: 'living-plan-v2' },
    components: [{ categoryId: 'legacy-atomic-settings', amountCents: 30000, fundingRhythm: 'monthly', source: 'override', overrideCents: 30000 }],
    receipt: { trigger: 'category_changed', outcome: 'invalid-late-failure', cause: 'API rollback regression' },
  } as unknown as CategorySettingsRequest['governance'];
  const failed = await command.execute(governed);
  assert.equal(failed.outcome, 'rejected');
  const receipt = await owner.client.rpc('get_budget_category_settings_receipt', {
    p_expected_actor_user_id: owner.actorUserId, p_request_id: governed.requestId,
  });
  assert.equal(receipt.error, null); assert.equal(receipt.data.code, '23514');
  assert.deepEqual(await rows(), original);
  assert.deepEqual(await command.execute(governed), failed);
  assert.deepEqual(await fetch(`${base}/fixture/receipt-count`).then(r => r.json()),
    { ...originalCounts, count: originalCounts.count + 1 });
  console.log('PASS: late governed failure rolls back category, plan and version writes; rejection persists and replay cannot apply it.');
} finally {
  await control('disable-governance');
}
console.log('Evidence boundary: synthetic local identities and fixture auth-user endpoint; real PostgreSQL 17/PostgREST JWT/RLS/RPC and production JS command/repository. No production household writes.');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
