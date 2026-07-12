import type { ActivitySuggestion } from './agentHandoffParsers';
import { mergeActivitySuggestions } from './activitySuggestionSelection';

export type ActivitySuggestionRequestReason = 'bootstrap' | 'regenerate';
export type ActivitySuggestionRequestOutcome = 'success' | 'quota' | 'transport-error';

export type ActivitySuggestionRequestState = {
  suggestions: ActivitySuggestion[] | null;
  hasGenerativeQuotaExceeded: boolean;
  hasTransportError: boolean;
  shouldResetAdoptionSummary: boolean;
};

export function resolveActivitySuggestionRequestState({
  outcome,
  reason,
  currentSuggestions,
  incomingSuggestions,
}: {
  outcome: ActivitySuggestionRequestOutcome;
  reason: ActivitySuggestionRequestReason;
  currentSuggestions: ActivitySuggestion[] | null | undefined;
  incomingSuggestions: ActivitySuggestion[] | null | undefined;
}): ActivitySuggestionRequestState {
  if (outcome === 'quota') {
    return {
      suggestions: null,
      hasGenerativeQuotaExceeded: true,
      hasTransportError: false,
      shouldResetAdoptionSummary: false,
    };
  }

  if (outcome === 'transport-error') {
    return {
      suggestions: null,
      hasGenerativeQuotaExceeded: false,
      hasTransportError: true,
      shouldResetAdoptionSummary: false,
    };
  }

  const suggestions = reason === 'regenerate'
    ? incomingSuggestions?.length
      ? mergeActivitySuggestions(currentSuggestions, incomingSuggestions)
      : (currentSuggestions ?? null)
    : (incomingSuggestions ?? null);

  return {
    suggestions,
    hasGenerativeQuotaExceeded: false,
    hasTransportError: false,
    shouldResetAdoptionSummary: reason === 'bootstrap' && Boolean(incomingSuggestions?.length),
  };
}
