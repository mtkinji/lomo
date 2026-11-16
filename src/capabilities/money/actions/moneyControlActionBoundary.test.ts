import type { MoneyRepository } from '../data/moneyRepository';
import { createMoneyControlActionBoundary } from './moneyControlActionBoundary';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { getLivingPlanSettings } from '../data/livingPlanRepository';
import { previewLivingPlanOverride } from '../runtime/livingPlanReconciliation';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../../services/backend/supabaseClient', () => ({ getSupabaseClient: jest.fn() }));
jest.mock('../runtime/moneyPrivacyLock', () => ({ loadMoneyPrivacyLockSettings: jest.fn(), authenticateMoneyPrivacyLock: jest.fn() }));
jest.mock('../runtime/moneyProAccess', () => ({ assertMoneyProAccess: jest.fn() }));
jest.mock('../data/livingPlanRepository', () => ({ getLivingPlanSettings: jest.fn() }));
jest.mock('../runtime/livingPlanReconciliation', () => ({ previewLivingPlanOverride: jest.fn() }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, value: string) => require('node:crypto').createHash('sha256').update(value).digest('hex') }));

const actor = '10000000-0000-4000-8000-000000000001';
const owner = '10000000-0000-4000-8000-000000000002';
const categoryId = '10000000-0000-4000-8000-000000000003';
const version = '2026-11-01T10:00:00.000Z';
const input = { requestId: 'chat:budget-1', categoryId, month: '2026-11', plannedCents: 60000, expectedUpdatedAt: version };

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

test.each([false, true])('native Chat uses household scope and durable request recovery (lost response: %s)', async (lostResponse) => {
  let loseReceiptRead = false;
  const receipts = new Map<string, unknown>();
  const rpc = jest.fn(async (name: string, args: { p_request_id?: string; p_settings?: unknown } = {}) => {
    if (name === 'budget_effective_owner_user_id') return { data: owner, error: null };
    if (name === 'get_budget_category_settings_receipt') {
      if (loseReceiptRead) { loseReceiptRead = false; return { data: null, error: { code: '08006', message: 'Offline' } }; }
      return { data: receipts.get(args.p_request_id ?? '') ?? null, error: null };
    }
    if (name === 'save_budget_category_settings') {
      const result = { requestId: args.p_request_id, categoryId, confirmedAt: version, categoryUpdatedAt: version,
        planUpdatedAt: version, activeVersionId: null, changes: args.p_settings };
      receipts.set(args.p_request_id ?? '', { ...result, request: { schemaVersion: 1, actorUserId: actor,
        requestId: args.p_request_id, categoryId, expectedCategoryUpdatedAt: '2026-11-01T10:00:00+00:00', expectedPlanUpdatedAt: '2026-11-01T10:00:00+00:00',
        settings: args.p_settings, governance: null } });
      if (lostResponse) { loseReceiptRead = true; return { data: null, error: { code: '08006', message: 'Response lost' } }; }
      return { data: result, error: null };
    }
    throw new Error(`Unexpected RPC ${name}`);
  });
  const client = { rpc, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: actor } }, error: null }) } };
  jest.mocked(getSupabaseClient).mockReturnValue(client as never);
  jest.mocked(getLivingPlanSettings).mockResolvedValue({ promotionEnabled: true, target: {} } as never);
  // No preview needed to model governance internals here; assert canonical scope on the caller.
  jest.mocked(previewLivingPlanOverride).mockResolvedValue(null as never);
  const loadSnapshot = jest.fn().mockResolvedValue({ generatedAt: version, categories: [{ id: 'food', sourceId: categoryId,
    name: 'Food', plannedCents: 50000, updatedAt: version, categoryUpdatedAt: version, planUpdatedAt: version,
    rolloverEnabled: false, rolloverPolicy: null, fundingRhythm: 'monthly', planRole: 'flexible', expectedNeed: null }] });
  const repository = { loadSnapshot } as unknown as MoneyRepository;
  const first = { categoryId, name: 'Food', plannedCents: 60000, updatedAt: version };
  const attempt = createMoneyControlActionBoundary(repository).applyBudgetChange(input);
  if (lostResponse) await expect(attempt).rejects.toThrow('could not confirm');
  else await expect(attempt).resolves.toEqual(first);
  expect(getLivingPlanSettings).toHaveBeenCalledWith(client, owner);
  expect(previewLivingPlanOverride).toHaveBeenCalledWith(client, 'food', 60000, {
    fundingRhythm: 'monthly', expectedNeedCents: null, expectedNeedDueMonth: null,
  }, owner);
  if (!lostResponse) await AsyncStorage.clear(); // Also exercise a second device without a local journal.
  loadSnapshot.mockRejectedValue(new Error('snapshot unavailable'));
  await expect(createMoneyControlActionBoundary(repository).applyBudgetChange(input)).resolves.toEqual(first);
  expect((await AsyncStorage.getAllKeys()).filter((key) => key.includes('category-settings'))).toEqual([]);
  const saves = rpc.mock.calls.filter(([name]) => name === 'save_budget_category_settings');
  expect(saves).toHaveLength(1);
  expect(saves[0][1]).toMatchObject({ p_expected_actor_user_id: actor, p_category_id: categoryId,
    p_request_id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/) });
  expect(loadSnapshot).toHaveBeenCalledTimes(1);
});
