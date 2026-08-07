import {
  ActivityActionCardRegistry,
  type ActivityActionCardProvider,
  type ActivityActionCardProjection,
  type ActivityCardViewerContext,
} from './activityActionCardRegistry';
import type { ActivityActionCardBinding } from './activityActionCardTypes';

const binding: ActivityActionCardBinding = {
  providerId: 'meal_planning', projectionKind: 'choice_round', resourceRef: 'round-1', sourceVersion: '4',
};
const context: ActivityCardViewerContext = { viewerPersonId: 'person-1', activityId: 'activity-1' };
const ready: ActivityActionCardProjection = {
  providerId: 'meal_planning', projectionKind: 'choice_round', state: 'ready', eyebrow: 'Meal Planning',
  title: 'What sounds good?', detail: 'Choose up to three.', freshnessLabel: 'Open now',
  primaryAction: { id: 'choose_meals', label: 'Choose meals' },
  secondaryAction: { id: 'pass', label: 'Pass' },
};

function provider(overrides: Partial<ActivityActionCardProvider> = {}): ActivityActionCardProvider {
  return {
    id: 'meal_planning',
    resolve: jest.fn(async () => ready),
    invoke: jest.fn(async (input) => ({
      id: `receipt:${input.idempotencyKey}`, providerId: 'meal_planning', actionId: input.actionId,
      idempotencyKey: input.idempotencyKey, outcome: 'completed' as const, code: null, returnTarget: null,
    })),
    ...overrides,
  };
}

describe('ActivityActionCardRegistry', () => {
  it('rejects duplicate provider IDs', () => {
    expect(() => new ActivityActionCardRegistry([provider(), provider()])).toThrow('Duplicate Activity action-card provider');
  });

  it('resolves an unknown provider to a finite unavailable projection', async () => {
    const registry = new ActivityActionCardRegistry([]);
    await expect(registry.resolve({ ...binding, providerId: 'future_provider' as never }, context)).resolves.toEqual(expect.objectContaining({
      providerId: 'future_provider', state: 'unavailable', primaryAction: null, secondaryAction: null,
    }));
  });

  it('rejects an action that the latest projection did not offer', async () => {
    const registered = provider();
    const registry = new ActivityActionCardRegistry([registered]);
    await expect(registry.invoke(binding, 'hidden_action', context, 'invoke-1')).resolves.toEqual(expect.objectContaining({
      outcome: 'rejected', code: 'action_not_offered',
    }));
    expect(registered.invoke).not.toHaveBeenCalled();
  });

  it('returns one receipt for repeated invocations with the same idempotency key', async () => {
    const registered = provider();
    const registry = new ActivityActionCardRegistry([registered]);
    const first = await registry.invoke(binding, 'choose_meals', context, 'invoke-1');
    const retry = await registry.invoke(binding, 'choose_meals', context, 'invoke-1');
    expect(retry).toEqual(first);
    expect(registered.invoke).toHaveBeenCalledTimes(1);
  });

  it('rejects a mismatched provider projection', async () => {
    const registered = provider({ resolve: jest.fn(async () => ({ ...ready, providerId: 'groceries' })) });
    const registry = new ActivityActionCardRegistry([registered]);
    await expect(registry.resolve(binding, context)).resolves.toEqual(expect.objectContaining({ state: 'failed' }));
  });
});
