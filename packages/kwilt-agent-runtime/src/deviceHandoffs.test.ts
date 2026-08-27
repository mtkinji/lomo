import {
  createDeviceHandoff,
  transitionDeviceHandoff,
  type DeviceActionHandoff,
} from './deviceHandoffs';

const created = (): DeviceActionHandoff => createDeviceHandoff({
  id: 'handoff-1', actorId: 'actor-1', householdId: 'household-1',
  operationId: 'screen_time.personal_rule.update', requestId: 'request-1',
  targetVersion: 2,
  arguments: {
    ruleId: 'rule-1', displayName: 'Homework rule', oauthToken: 'secret-token',
    photoBytes: 'raw-photo', nested: { opaqueSelectionToken: 'opaque-value', safe: true },
  },
  createdAt: '2026-08-27T18:00:00.000Z', expiresAt: '2026-08-27T18:15:00.000Z',
});

describe('device action handoffs', () => {
  test('stores only redacted arguments and a stable owner/idempotency identity', () => {
    expect(created()).toMatchObject({
      id: 'handoff-1', actorId: 'actor-1', householdId: 'household-1',
      operationId: 'screen_time.personal_rule.update', requestId: 'request-1',
      state: 'created', version: 1, targetVersion: 2,
      redactedArguments: {
        ruleId: 'rule-1', displayName: 'Homework rule', oauthToken: '[REDACTED]',
        photoBytes: '[REDACTED]', nested: { opaqueSelectionToken: '[REDACTED]', safe: true },
      },
    });
  });

  test('redacts financial credentials even when they arrive as ordinary fields', () => {
    const handoff = createDeviceHandoff({
      ...created(),
      arguments: {
        accountNumber: '12345678', routing_number: '87654321', cardNumber: '4111111111111111',
        cvv: '123', ssn: '000-00-0000', nickname: 'Household checking',
      },
    });
    expect(handoff.redactedArguments).toEqual({
      accountNumber: '[REDACTED]', routing_number: '[REDACTED]', cardNumber: '[REDACTED]',
      cvv: '[REDACTED]', ssn: '[REDACTED]', nickname: 'Household checking',
    });
  });

  test('supports created to claimed to completed with optimistic versioning', () => {
    const claimed = transitionDeviceHandoff(created(), {
      actorId: 'actor-1', from: 'created', to: 'claimed', expectedVersion: 1,
      occurredAt: '2026-08-27T18:01:00.000Z', resultRefs: [],
    });
    const completed = transitionDeviceHandoff(claimed, {
      actorId: 'actor-1', from: 'claimed', to: 'completed', expectedVersion: 2,
      occurredAt: '2026-08-27T18:02:00.000Z', resultRefs: [{ kind: 'screen_time_rule', id: 'rule-1' }],
    });
    expect(completed).toMatchObject({ state: 'completed', version: 3, completedAt: '2026-08-27T18:02:00.000Z' });
    expect(completed.resultRefs).toEqual([{ kind: 'screen_time_rule', id: 'rule-1' }]);
  });

  test.each(['cancelled', 'expired'] as const)('supports created to %s', (to) => {
    expect(transitionDeviceHandoff(created(), {
      actorId: 'actor-1', from: 'created', to, expectedVersion: 1,
      occurredAt: '2026-08-27T18:03:00.000Z', resultRefs: [],
    })).toMatchObject({ state: to, version: 2 });
  });

  test('refuses cross-owner, stale-version, and illegal transitions', () => {
    expect(() => transitionDeviceHandoff(created(), {
      actorId: 'actor-2', from: 'created', to: 'claimed', expectedVersion: 1,
      occurredAt: '2026-08-27T18:01:00.000Z', resultRefs: [],
    })).toThrow('handoff_owner_mismatch');
    expect(() => transitionDeviceHandoff(created(), {
      actorId: 'actor-1', from: 'created', to: 'claimed', expectedVersion: 2,
      occurredAt: '2026-08-27T18:01:00.000Z', resultRefs: [],
    })).toThrow('handoff_version_conflict');
    expect(() => transitionDeviceHandoff(created(), {
      actorId: 'actor-1', from: 'created', to: 'completed', expectedVersion: 1,
      occurredAt: '2026-08-27T18:01:00.000Z', resultRefs: [],
    })).toThrow('handoff_transition_invalid');
  });
});
