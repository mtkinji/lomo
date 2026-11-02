import { prepareCategorySettingsRequest } from './categorySettingsPreparation';
import type { MoneyCategory } from '../data/moneySnapshot';
import type { CategorySettings } from '../domain/categorySettingsCommand';
import type { ReadyLivingPlanOverridePreview } from './livingPlanReconciliation';

const category = { id: 'food', sourceId: '10000000-0000-4000-8000-000000000003',
  categoryUpdatedAt: '2026-11-01T10:00:00Z', planUpdatedAt: '2026-11-01T10:00:00Z',
} as MoneyCategory;
const settings: CategorySettings = { name: 'Food', budgetCents: 50000, fundingRhythm: 'monthly', rolloverEnabled: false,
  rolloverPolicy: null, planRole: 'flexible', expectedNeedCents: null, expectedNeedDueMonth: null };
const input = { actorUserId: '10000000-0000-4000-8000-000000000002', requestId: '10000000-0000-4000-8000-000000000001', category, settings };
const preview = { outcome: 'ready', expectedActiveVersionId: null, candidateHash: 'reviewed',
  candidate: { candidateHash: 'reviewed', allocations: [{ categoryId: 'food', amountCents: 50000, fundingRhythm: 'monthly', expectedNeed: null }] },
  comparison: { outcome: 'material', changedCategoryIds: ['food'], materialReasons: ['allocation_changed'] },
} as ReadyLivingPlanOverridePreview;

describe('category settings request preparation', () => {
  it('uses the editor versions and exact reviewed candidate', () => {
    const result = prepareCategorySettingsRequest({ ...input, preview });
    expect(result.expectedCategoryUpdatedAt).toBe(category.categoryUpdatedAt);
    expect(result.expectedPlanUpdatedAt).toBe(category.planUpdatedAt);
    expect(result.governance?.candidate).toEqual(preview.candidate);
    expect(result.governance?.receipt.outcome).toBe('initial');
    expect(result.settings).toEqual(settings);
  });
  it('rejects old cache data instead of inventing version timestamps', () => {
    expect(() => prepareCategorySettingsRequest({ ...input, category: { ...category, categoryUpdatedAt: undefined } })).toThrow('Refresh');
  });
  it('rejects a draft that no longer matches its reviewed allocation', () => {
    expect(() => prepareCategorySettingsRequest({ ...input, settings: { ...settings, budgetCents: 60000 }, preview })).toThrow('no longer matches');
  });
  it('rejects a replaced reviewed candidate hash', () => {
    expect(() => prepareCategorySettingsRequest({ ...input, preview: { ...preview, candidateHash: 'different' } })).toThrow('no longer valid');
  });
});
