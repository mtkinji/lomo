/** Native acceptance adapter. Only synthetic loopback data; no production config. */
import { createClient } from '@supabase/supabase-js';
import { projectMoneySnapshot } from '../../../src/capabilities/money/data/moneySnapshot';
import { createCategorySettingsRepository } from '../../../src/capabilities/money/data/categorySettingsRepository';
import { createCategorySettingsJournal } from '../../../src/capabilities/money/runtime/categorySettingsJournal';
import { createMoneyCategorySettingsCommand } from '../../../src/capabilities/money/runtime/moneyCategorySettingsCommand';
import type { CategorySettingsRequest } from '../../../src/capabilities/money/domain/categorySettingsCommand';

// Bypass the harness's in-memory adapter only for a fixture-owned namespace.
// No host account/store keys are read, modified or cleared.
const nativeStorage = require('../../../node_modules/@react-native-async-storage/async-storage/lib/commonjs/index.js').default as typeof import('@react-native-async-storage/async-storage').default;
const namespace = 'kwilt:budget-native-fixture:';
const journal = createCategorySettingsJournal({
  getItem: (key) => nativeStorage.getItem(namespace + key),
  setItem: (key, value) => nativeStorage.setItem(namespace + key, value),
  removeItem: (key) => nativeStorage.removeItem(namespace + key),
});
const base = 'http://localhost:8082';
async function connect() {
  const response = await fetch(`${base}/fixture/session`);
  if (!response.ok) throw new Error('Start the isolated Budget API fixture first.');
  const identity = await response.json() as { actorUserId: string; categoryId: string; token: string };
  const client = createClient(base, 'synthetic-fixture-key', {
    global: { headers: { Authorization: `Bearer ${identity.token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { ...identity, client, command: createMoneyCategorySettingsCommand(journal, createCategorySettingsRepository(client)) };
}
let active: Awaited<ReturnType<typeof connect>> | null = null;
export async function openSettingsFixture() {
  active = await connect();
  return { actorUserId: active.actorUserId, snapshot: await reloadSettingsSnapshot() };
}
export async function reloadSettingsSnapshot() {
  if (!active) throw new Error('Open the settings fixture first.');
  const [categories, plans] = await Promise.all([active.client.from('budget_categories').select('*'), active.client.from('budget_plans').select('*')]);
  if (categories.error) throw categories.error;
  if (plans.error) throw plans.error;
  return projectMoneySnapshot({ categories: categories.data, plans: plans.data, transactions: [], accounts: [], connections: [] });
}
export function pendingSettings(category: string) {
  if (!active) throw new Error('Open the settings fixture first.');
  return active.command.loadPending(active.actorUserId, category);
}
export function saveSettings(request: CategorySettingsRequest) {
  if (!active) throw new Error('Open the settings fixture first.');
  return active.command.execute(request);
}
export async function settingsFault(action: 'lose-response' | 'recover') {
  const response = await fetch(`${base}/fixture/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
  if (!response.ok) throw new Error('Isolated fixture control failed.');
}
