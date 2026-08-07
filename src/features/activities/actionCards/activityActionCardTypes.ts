export type {
  ActivityActionCardBinding,
  ActivityActionCardProviderId,
  ActivitySourceReference,
} from '../../../domain/types';

import type {
  ActivityActionCardBinding,
  ActivityActionCardProviderId,
} from '../../../domain/types';

export type ActivityCardAction = {
  id: string;
  label: string;
  accessibilityLabel?: string;
};

export type ActivityActionCardProjection = {
  providerId: string;
  projectionKind: string;
  state: 'ready' | 'completed' | 'stale' | 'disconnected' | 'unauthorized' | 'unavailable' | 'failed';
  eyebrow: string;
  title: string;
  detail: string | null;
  freshnessLabel: string | null;
  primaryAction: ActivityCardAction | null;
  secondaryAction: ActivityCardAction | null;
};

export type ActivityCardViewerContext = {
  viewerPersonId: string;
  activityId: string;
};

export type ActivityCardReceipt = {
  id: string;
  providerId: string;
  actionId: string;
  idempotencyKey: string;
  outcome: 'completed' | 'declined' | 'rejected' | 'failed';
  code: string | null;
  returnTarget: Record<string, unknown> | null;
};

export type ActivityCardInvokeInput = {
  binding: ActivityActionCardBinding;
  context: ActivityCardViewerContext;
  actionId: string;
  idempotencyKey: string;
};

export interface ActivityActionCardProvider {
  readonly id: ActivityActionCardProviderId;
  resolve(
    binding: ActivityActionCardBinding,
    context: ActivityCardViewerContext,
  ): Promise<ActivityActionCardProjection>;
  invoke(input: ActivityCardInvokeInput): Promise<ActivityCardReceipt>;
}
