/** Explicit HTTP acceptance, excluded from the ordinary Jest testMatch.
 * Runs only against the disposable loopback harness. The injected Supabase
 * client and repository are real; no RPC, auth response or fetch is mocked.
 */
import { fetch as nodeFetch } from 'cross-fetch';
import { createClient } from '@supabase/supabase-js';
import { createMoneyRepository } from '../../../src/capabilities/money/data/moneyRepository';

const base = 'http://127.0.0.1:8082';
async function session(actor: string) {
  const response = await nodeFetch(`${base}/fixture/session?actor=${actor}`);
  if (!response.ok) throw new Error('Start the disposable Budget API harness first.');
  const identity = await response.json() as { token: string; categoryId: string; ruleTransactions: Record<string, string> };
  const client = createClient(base, 'synthetic-fixture-key', {
    global: { fetch: nodeFetch as unknown as typeof fetch, headers: { Authorization: `Bearer ${identity.token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { ...identity, client, repository: createMoneyRepository(client) };
}

it('persists literal partial and transfer rules through the production repository and signed-JWT PostgREST API', async () => {
  const owner = await session('owner');
  const partial = { transactionId: owner.ruleTransactions.partial, merchantName: 'Online Payment',
    originalDescription: 'Online Payment 12345 To Taylor Example 10/23', categoryId: owner.categoryId,
    categoryName: 'Household', matchMode: 'partial' as const, merchantPattern: 'Taylor Example' };
  const receipt = await owner.repository.saveMerchantRule(partial);
  expect(receipt).toMatchObject({ targetKind: 'category', merchantKey: 'taylor example', appliedTransactionCount: 2,
    effectiveTargetKind: 'category', effectiveCategorySourceId: owner.categoryId });
  const history = await owner.client.from('budget_transactions').select('budget_id,budget_match_source').eq('id', owner.ruleTransactions.history).single();
  expect(history.error).toBeNull();
  expect(history.data).toMatchObject({ budget_id: owner.categoryId, budget_match_source: 'merchant_rule' });

  const adult = await session('adult');
  const transfer = { transactionId: owner.ruleTransactions.transfer, merchantName: 'Broker', targetKind: 'transfer' as const };
  expect(await adult.repository.saveMerchantRule(transfer)).toMatchObject({ targetKind: 'transfer', categorySourceId: null,
    effectiveTargetKind: 'transfer', effectiveCategorySourceId: null, appliedTransactionCount: 1 });
  const incoming = await owner.client.from('budget_transactions').select('money_meaning,money_meaning_source,budget_id').eq('id', owner.ruleTransactions.incoming).single();
  expect(incoming.error).toBeNull();
  expect(incoming.data).toEqual({ money_meaning: 'transfer', money_meaning_source: 'rule', budget_id: null });

  // A new repository instance reads the same durable rules (no local-only success).
  const reopened = await session('owner');
  const persisted = await reopened.client.from('budget_transaction_match_rules').select('rule_kind,match_version,merchant_contains');
  expect(persisted.error).toBeNull();
  expect(persisted.data).toEqual(expect.arrayContaining([
    { rule_kind: 'category', match_version: 'contains_v2', merchant_contains: 'taylor example' },
    { rule_kind: 'transfer', match_version: 'contains_v2', merchant_contains: 'broker' },
  ]));
  for (const actor of ['child', 'other', 'anonymous']) {
    await expect((await session(actor)).repository.saveMerchantRule(transfer)).rejects.toThrow();
  }
}, 20000);
