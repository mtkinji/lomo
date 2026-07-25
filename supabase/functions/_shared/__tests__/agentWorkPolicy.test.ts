import { resolveAgentWorkCompletion } from '../agentWorkPolicy';

describe('canonical proactive work completion policy', () => {
  test.each([
    ['reminder', { deliveryCheckpointed: true }],
    ['recurring_kwilt_action', { receiptStatus: 'applied' }],
    ['monitor', { observationPersisted: true, deliveryCheckpointed: true }],
    ['background_analysis', { runStatus: 'complete' }],
    ['native_device_enforcement', { clientActionStatus: 'completed' }],
  ] as const)('%s completes only with its authoritative evidence', (kind, evidence) => {
    expect(resolveAgentWorkCompletion({ kind, evidence })).toEqual({ decision: 'complete' });
  });

  test.each([
    ['reminder', { runStatus: 'complete' }],
    ['recurring_kwilt_action', { runStatus: 'complete', deliveryCheckpointed: true }],
    ['monitor', { observationPersisted: true }],
    ['native_device_enforcement', { runStatus: 'complete' }],
  ] as const)('%s stays pending when only non-authoritative work finished', (kind, evidence) => {
    expect(resolveAgentWorkCompletion({ kind, evidence })).toEqual({
      decision: 'pending', reason: expect.any(String),
    });
  });

  test('background analysis can be partial but never treats a failed run as complete', () => {
    expect(resolveAgentWorkCompletion({ kind: 'background_analysis', evidence: { runStatus: 'partial' } }))
      .toEqual({ decision: 'complete' });
    expect(resolveAgentWorkCompletion({ kind: 'background_analysis', evidence: { runStatus: 'failed' } }))
      .toEqual({ decision: 'pending', reason: 'analysis_not_persisted' });
  });
});
