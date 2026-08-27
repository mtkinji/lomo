import type { MoneySnapshot } from '../data/moneySnapshot';
import { applyGovernedMoneyBudgetUpdate } from './moneyBudgetControlBoundary';

const snapshot = (plannedCents = 40000): MoneySnapshot => ({
  generatedAt: '2026-08-27T12:00:00.000Z',
  categories: [{
    id: 'allocation-food', sourceId: 'category-food', name: 'Food', plannedCents,
    updatedAt: plannedCents === 40000 ? '2026-08-27T11:00:00.000Z' : '2026-08-27T12:01:00.000Z',
    fundingRhythm: 'monthly',
  }],
} as MoneySnapshot);

test('commits a conversational budget update through the governed Living Plan path', async () => {
  const loadSnapshot = jest.fn()
    .mockResolvedValueOnce(snapshot())
    .mockResolvedValueOnce(snapshot(50000));
  const directUpdate = jest.fn();
  const preview = jest.fn().mockResolvedValue({
    outcome: 'ready', expectedActiveVersionId: 'version-old', candidateHash: 'candidate-hash',
    candidate: { candidateHash: 'candidate-hash', allocations: [{
      categoryId: 'allocation-food', amountCents: 50000, fundingRhythm: 'monthly',
    }] }, comparison: { changedCategoryIds: ['allocation-food'] },
  });
  const commit = jest.fn().mockResolvedValue({ outcome: 'promoted', versionId: 'version-new' });

  await expect(applyGovernedMoneyBudgetUpdate({
    categoryId: 'category-food', budgetCents: 50000,
    expectedUpdatedAt: '2026-08-27T11:00:00.000Z',
    loadSnapshot, directUpdate,
    loadSettings: jest.fn().mockResolvedValue({ promotionEnabled: true, target: { livingPercent: 70 } }),
    preview, commit,
  })).resolves.toEqual({ confirmedAt: '2026-08-27T12:01:00.000Z' });

  expect(directUpdate).not.toHaveBeenCalled();
  expect(preview).toHaveBeenCalledWith('allocation-food', 50000, {
    fundingRhythm: 'monthly', expectedNeedCents: null, expectedNeedDueMonth: null,
  });
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({
    planCategoryId: 'category-food', allocationCategoryId: 'allocation-food', amountCents: 50000,
  }));
});

test('uses the exact versioned category write when governed Living Plan is disabled', async () => {
  const directUpdate = jest.fn().mockResolvedValue({ confirmedAt: '2026-08-27T12:01:00.000Z' });
  await expect(applyGovernedMoneyBudgetUpdate({
    categoryId: 'category-food', budgetCents: 50000,
    expectedUpdatedAt: '2026-08-27T11:00:00.000Z',
    loadSnapshot: jest.fn().mockResolvedValue(snapshot()), directUpdate,
    loadSettings: jest.fn().mockResolvedValue({ promotionEnabled: false, target: null }),
    preview: jest.fn(), commit: jest.fn(),
  })).resolves.toEqual({ confirmedAt: '2026-08-27T12:01:00.000Z' });

  expect(directUpdate).toHaveBeenCalledWith(
    'category-food', { budgetCents: 50000 }, { expectedUpdatedAt: '2026-08-27T11:00:00.000Z' },
  );
});

test('rejects a stale category before previewing or writing', async () => {
  const preview = jest.fn();
  const directUpdate = jest.fn();
  await expect(applyGovernedMoneyBudgetUpdate({
    categoryId: 'category-food', budgetCents: 50000, expectedUpdatedAt: 'stale',
    loadSnapshot: jest.fn().mockResolvedValue(snapshot()), directUpdate,
    loadSettings: jest.fn(), preview, commit: jest.fn(),
  })).rejects.toThrow('money_target_stale');
  expect(preview).not.toHaveBeenCalled();
  expect(directUpdate).not.toHaveBeenCalled();
});
