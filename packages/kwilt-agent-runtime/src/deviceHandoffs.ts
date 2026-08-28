export type DeviceActionHandoffState = 'created' | 'claimed' | 'completed' | 'cancelled' | 'expired';

export type DeviceActionHandoff = {
  id: string;
  actorId: string;
  householdId: string;
  operationId: string;
  requestId: string;
  targetVersion: number | null;
  state: DeviceActionHandoffState;
  version: number;
  redactedArguments: Record<string, unknown>;
  resultRefs: readonly { kind: string; id: string }[];
  createdAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  expiresAt: string;
};

const SENSITIVE_KEY = /(token|secret|password|credential|authorization|photo|image|bytes|binary|opaque|account.?number|routing.?number|card.?number|cvv|cvc|social.?security|ssn|passcode|\bpin\b)/i;

export function redactActionArguments(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactActionArguments(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([entryKey, entryValue]) => [entryKey, redactActionArguments(entryValue, entryKey)]));
  }
  return value;
}

export function createDeviceHandoff(input: {
  id: string;
  actorId: string;
  householdId: string;
  operationId: string;
  requestId: string;
  targetVersion: number | null;
  arguments: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}): DeviceActionHandoff {
  return {
    id: input.id,
    actorId: input.actorId,
    householdId: input.householdId,
    operationId: input.operationId,
    requestId: input.requestId,
    targetVersion: input.targetVersion,
    state: 'created',
    version: 1,
    redactedArguments: redactActionArguments(input.arguments) as Record<string, unknown>,
    resultRefs: [],
    createdAt: input.createdAt,
    claimedAt: null,
    completedAt: null,
    cancelledAt: null,
    expiredAt: null,
    expiresAt: input.expiresAt,
  };
}

const TRANSITIONS: Readonly<Record<DeviceActionHandoffState, readonly DeviceActionHandoffState[]>> = {
  created: ['claimed', 'cancelled', 'expired'],
  claimed: ['completed', 'cancelled', 'expired'],
  completed: [],
  cancelled: [],
  expired: [],
};

export function transitionDeviceHandoff(
  handoff: DeviceActionHandoff,
  transition: {
    actorId: string;
    from: DeviceActionHandoffState;
    to: DeviceActionHandoffState;
    expectedVersion: number;
    occurredAt: string;
    resultRefs: readonly { kind: string; id: string }[];
  },
): DeviceActionHandoff {
  if (handoff.actorId !== transition.actorId) throw new Error('handoff_owner_mismatch');
  if (handoff.version !== transition.expectedVersion) throw new Error('handoff_version_conflict');
  if (handoff.state !== transition.from || !TRANSITIONS[handoff.state].includes(transition.to)) {
    throw new Error('handoff_transition_invalid');
  }
  return {
    ...handoff,
    state: transition.to,
    version: handoff.version + 1,
    resultRefs: transition.to === 'completed' ? transition.resultRefs : handoff.resultRefs,
    claimedAt: transition.to === 'claimed' ? transition.occurredAt : handoff.claimedAt,
    completedAt: transition.to === 'completed' ? transition.occurredAt : handoff.completedAt,
    cancelledAt: transition.to === 'cancelled' ? transition.occurredAt : handoff.cancelledAt,
    expiredAt: transition.to === 'expired' ? transition.occurredAt : handoff.expiredAt,
  };
}
