import type { SupabaseClient } from '@supabase/supabase-js';
import type { MoneyRepository } from '../data/moneyRepository';
import { initializeGovernedMoneyPlan } from './moneyPlanLifecycle';

describe('governed Money lifecycle', () => {
  it('reconciles ungoverned activity and consumes the monthly boundary before returning truth', async () => {
    const first = { generatedAt: 'before' };
    const after = { generatedAt: 'after' };
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(async () => undefined),
      loadSnapshot: jest.fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(after),
    } as unknown as MoneyRepository;
    const reconcile = jest.fn(async () => ({ outcome: 'promoted' as const, versionId: 'version-2' }));

    await expect(initializeGovernedMoneyPlan(
      repository,
      {} as SupabaseClient,
      reconcile,
    )).resolves.toBe(after);

    expect(repository.ensureGovernedPlanFoundation).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(expect.anything(), 'period_rollover');
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(2);
  });

  it('does not reload when the same-period plan is already current', async () => {
    const snapshot = { generatedAt: 'current' };
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(async () => undefined),
      loadSnapshot: jest.fn(async () => snapshot),
    } as unknown as MoneyRepository;

    await expect(initializeGovernedMoneyPlan(
      repository,
      {} as SupabaseClient,
      async () => ({ outcome: 'no_op' }),
    )).resolves.toBe(snapshot);
    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
  });
});
