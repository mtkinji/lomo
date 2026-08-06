import type {
  ActivityActionCardBinding,
  ActivityActionCardProjection,
  ActivityActionCardProvider,
  ActivityCardReceipt,
  ActivityCardViewerContext,
} from './activityActionCardTypes';

export type {
  ActivityActionCardProjection,
  ActivityActionCardProvider,
  ActivityCardReceipt,
  ActivityCardViewerContext,
} from './activityActionCardTypes';

function unavailable(binding: ActivityActionCardBinding): ActivityActionCardProjection {
  return {
    providerId: binding.providerId,
    projectionKind: binding.projectionKind,
    state: 'unavailable',
    eyebrow: 'Connected action',
    title: 'This action is not available here',
    detail: 'The original information is still attached to this to-do.',
    freshnessLabel: null,
    primaryAction: null,
    secondaryAction: null,
  };
}

function failed(binding: ActivityActionCardBinding): ActivityActionCardProjection {
  return {
    ...unavailable(binding),
    state: 'failed',
    title: 'This action could not be loaded',
    detail: 'Try again without changing the to-do.',
  };
}

export class ActivityActionCardRegistry {
  private readonly providers = new Map<string, ActivityActionCardProvider>();
  private readonly receipts = new Map<string, Promise<ActivityCardReceipt>>();

  constructor(
    providers: readonly ActivityActionCardProvider[],
    private readonly generateIdempotencyKey: () => string = () => `activity-card:${Date.now()}:${Math.random().toString(36).slice(2)}`,
  ) {
    for (const provider of providers) {
      if (this.providers.has(provider.id)) {
        throw new Error(`Duplicate Activity action-card provider: ${provider.id}`);
      }
      this.providers.set(provider.id, provider);
    }
  }

  async resolve(
    binding: ActivityActionCardBinding,
    context: ActivityCardViewerContext,
  ): Promise<ActivityActionCardProjection> {
    const provider = this.providers.get(binding.providerId);
    if (!provider) return unavailable(binding);
    try {
      const projection = await provider.resolve(binding, context);
      if (projection.providerId !== binding.providerId || projection.projectionKind !== binding.projectionKind) {
        return failed(binding);
      }
      return projection;
    } catch {
      return failed(binding);
    }
  }

  async invoke(
    binding: ActivityActionCardBinding,
    actionId: string,
    context: ActivityCardViewerContext,
    idempotencyKey: string = this.generateIdempotencyKey(),
  ): Promise<ActivityCardReceipt> {
    const receiptKey = `${binding.providerId}:${idempotencyKey}`;
    const prior = this.receipts.get(receiptKey);
    if (prior) return prior;
    const provider = this.providers.get(binding.providerId);
    const projection = await this.resolve(binding, context);
    const offered = [projection.primaryAction, projection.secondaryAction]
      .some((action) => action?.id === actionId);
    if (!provider || !offered) {
      return {
        id: `rejected:${idempotencyKey}`,
        providerId: binding.providerId,
        actionId,
        idempotencyKey,
        outcome: 'rejected',
        code: 'action_not_offered',
        returnTarget: null,
      };
    }
    const invocation = provider.invoke({ binding, context, actionId, idempotencyKey });
    this.receipts.set(receiptKey, invocation);
    try {
      return await invocation;
    } catch (error) {
      this.receipts.delete(receiptKey);
      throw error;
    }
  }
}

export const defaultActivityActionCardRegistry = new ActivityActionCardRegistry([]);
