/** Synthetic native rule acceptance only; never reads app config or auth storage. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMoneyRepository, type MoneyRepository } from '../../../src/capabilities/money/data/moneyRepository';
import { projectMoneySnapshot } from '../../../src/capabilities/money/data/moneySnapshot';

const base = 'http://127.0.0.1:8082';
type Identity = { actorUserId: string; token: string; categoryId: string; ruleTransactions: Record<string, string> };
let active: { identity: Identity; client: SupabaseClient; repository: MoneyRepository } | null = null;
export async function openRuleFixture(kind: 'partial' | 'transfer', fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${base}/fixture/session`);
  if (!response.ok) throw new Error('Start the isolated Budget API fixture first.');
  const identity = await response.json() as Identity;
  const client = createClient(base, 'synthetic-fixture-key', {
    global: { fetch: fetcher, headers: { Authorization: `Bearer ${identity.token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  active = { identity, client, repository: createMoneyRepository(client) };
  return { actorUserId: identity.actorUserId, transactionId: identity.ruleTransactions[kind], snapshot: await reloadRuleSnapshot() };
}
export async function reloadRuleSnapshot() {
  if (!active) throw new Error('Open the rule fixture first.');
  const { client, identity } = active;
  const [categories, plans, transactions, rules] = await Promise.all([
    client.from('budget_categories').select('*'), client.from('budget_plans').select('*'),
    client.from('budget_transactions').select('*'), client.from('budget_transaction_match_rules').select('*'),
  ]);
  for (const result of [categories, plans, transactions, rules]) if (result.error) throw result.error;
  return projectMoneySnapshot({ categories: categories.data!, plans: plans.data!, rules: rules.data!,
    accounts: [], connections: [], transactions: transactions.data!.map(row => ({ ...row,
      // The SQL fixture omits dates/accounts; provide presentation-only values.
      date: '2026-10-23', account_id: null,
      // Start at the existing assigned-category offer without adding a second
      // write family to this fixture. Rule saves/readback use the real API.
      ...(row.id === identity.ruleTransactions.partial && !row.budget_id
        ? { budget_id: identity.categoryId, budget_match_source: 'corrected' } : {}),
    })) });
}
export function saveRuleFixture(input: Parameters<MoneyRepository['saveMerchantRule']>[0]) {
  if (!active) throw new Error('Open the rule fixture first.');
  return active.repository.saveMerchantRule(input);
}
