import type { SupabaseClient } from '@supabase/supabase-js';
import type { MoneyRepository } from '../data/moneyRepository';
import { initializeGovernedMoneyPlan } from './moneyPlanLifecycle';

describe('governed Money lifecycle', () => {
  it('publishes the readable snapshot before governed-plan maintenance finishes', async () => {
    const snapshot = { generatedAt: 'readable-now' };
    let finishFoundation!: () => void;
    const foundationPending = new Promise<void>((resolve) => { finishFoundation = resolve; });
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(() => foundationPending),
      loadSnapshot: jest.fn(async () => snapshot),
    } as unknown as MoneyRepository;
    const onSnapshotReady = jest.fn();

    const initialization = initializeGovernedMoneyPlan(
      repository,
      {} as SupabaseClient,
      async () => ({ outcome: 'no_op' }),
      onSnapshotReady,
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(onSnapshotReady).toHaveBeenCalledWith(snapshot);
    expect(repository.ensureGovernedPlanFoundation).toHaveBeenCalledTimes(1);

    finishFoundation();
    await expect(initialization).resolves.toBe(snapshot);
  });

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

  it('keeps the readable Money snapshot when foundation maintenance is temporarily unavailable', async () => {
    const snapshot = { generatedAt: 'readable' };
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(async () => {
        throw new Error('governance unavailable');
      }),
      loadSnapshot: jest.fn(async () => snapshot),
    } as unknown as MoneyRepository;
    const reconcile = jest.fn(async () => ({ outcome: 'no_op' as const }));

    await expect(initializeGovernedMoneyPlan(
      repository,
      {} as SupabaseClient,
      reconcile,
    )).resolves.toBe(snapshot);

    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('keeps the loaded Money snapshot when period reconciliation fails', async () => {
    const snapshot = { generatedAt: 'readable' };
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(async () => undefined),
      loadSnapshot: jest.fn(async () => snapshot),
    } as unknown as MoneyRepository;

    await expect(initializeGovernedMoneyPlan(
      repository,
      {} as SupabaseClient,
      async () => {
        throw new Error('period reconciliation unavailable');
      },
    )).resolves.toBe(snapshot);

    expect(repository.loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps the pre-promotion snapshot when the promoted reload fails', async () => {
    const snapshot = { generatedAt: 'before-promotion' };
    const repository = {
      ensureGovernedPlanFoundation: jest.fn(async () => undefined),
      loadSnapshot: jest.fn()
        .mockResolvedValueOnce(snapshot)
        .mockRejectedValueOnce(new Error('promoted snapshot unavailable')),
    } as unknown as MoneyRepository;

    await expect(initializeGovernedMoneyPlan(
      repository,
      {} as SupabaseClient,
      async () => ({ outcome: 'promoted' as const, versionId: 'version-2' }),
    )).resolves.toBe(snapshot);
  });
});
