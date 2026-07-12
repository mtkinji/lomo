import type { ActivitySuggestion } from './agentHandoffParsers';
import { resolveActivitySuggestionRequestState } from './activitySuggestionRequestState';

const suggestion = (id: string, title: string): ActivitySuggestion => ({ id, title });

describe('activity suggestion request state', () => {
  it('replaces the rail and resets adoption summary after bootstrap success', () => {
    const incoming = [suggestion('new', 'New idea')];

    expect(
      resolveActivitySuggestionRequestState({
        outcome: 'success',
        reason: 'bootstrap',
        currentSuggestions: [suggestion('old', 'Old idea')],
        incomingSuggestions: incoming,
      }),
    ).toEqual({
      suggestions: incoming,
      hasGenerativeQuotaExceeded: false,
      hasTransportError: false,
      shouldResetAdoptionSummary: true,
    });
  });

  it('keeps the current rail when regeneration returns no usable suggestions', () => {
    const current = [suggestion('old', 'Old idea')];

    expect(
      resolveActivitySuggestionRequestState({
        outcome: 'success',
        reason: 'regenerate',
        currentSuggestions: current,
        incomingSuggestions: null,
      }).suggestions,
    ).toBe(current);
  });

  it.each([
    ['quota', true, false],
    ['transport-error', false, true],
  ] as const)('clears suggestions for a %s outcome', (outcome, quota, transport) => {
    expect(
      resolveActivitySuggestionRequestState({
        outcome,
        reason: 'bootstrap',
        currentSuggestions: [suggestion('old', 'Old idea')],
        incomingSuggestions: null,
      }),
    ).toEqual({
      suggestions: null,
      hasGenerativeQuotaExceeded: quota,
      hasTransportError: transport,
      shouldResetAdoptionSummary: false,
    });
  });
});
