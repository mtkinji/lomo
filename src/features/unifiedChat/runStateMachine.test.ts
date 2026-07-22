import {
  InvalidUnifiedChatTransitionError,
  StaleUnifiedChatVersionError,
  transitionProposal,
  transitionRun,
} from './runStateMachine';

describe('Unified Chat run state machine', () => {
  test.each([
    ['queued', 'active'],
    ['queued', 'stopped'],
    ['active', 'steered'],
    ['active', 'partial'],
    ['active', 'complete'],
    ['steered', 'active'],
    ['partial', 'active'],
  ] as const)('allows %s -> %s and increments the version', (status, nextStatus) => {
    expect(transitionRun({ status, version: 4 }, nextStatus, 4)).toEqual({
      status: nextStatus,
      version: 5,
    });
  });

  test.each(['complete', 'stopped', 'failed'] as const)(
    'keeps terminal run state %s immutable',
    (status) => {
      expect(() => transitionRun({ status, version: 2 }, 'active', 2)).toThrow(
        InvalidUnifiedChatTransitionError,
      );
    },
  );

  test('rejects a stale run command before evaluating the transition', () => {
    expect(() => transitionRun({ status: 'active', version: 3 }, 'complete', 2)).toThrow(
      StaleUnifiedChatVersionError,
    );
  });
});

describe('Unified Chat proposal state machine', () => {
  test.each([
    ['pending', 'edited'],
    ['pending', 'rejected'],
    ['pending', 'deferred'],
    ['pending', 'approved'],
    ['edited', 'edited'],
    ['deferred', 'approved'],
    ['approved', 'applying'],
    ['applying', 'applied'],
    ['applying', 'failed'],
    ['failed', 'approved'],
    ['applied', 'undone'],
  ] as const)('allows %s -> %s and increments the version', (status, nextStatus) => {
    expect(transitionProposal({ status, version: 7 }, nextStatus, 7)).toEqual({
      status: nextStatus,
      version: 8,
    });
  });

  test.each(['rejected', 'undone'] as const)(
    'keeps terminal proposal state %s immutable',
    (status) => {
      expect(() => transitionProposal({ status, version: 2 }, 'approved', 2)).toThrow(
        InvalidUnifiedChatTransitionError,
      );
    },
  );

  test('rejects a stale proposal decision', () => {
    expect(() => transitionProposal({ status: 'pending', version: 3 }, 'approved', 2)).toThrow(
      StaleUnifiedChatVersionError,
    );
  });
});
