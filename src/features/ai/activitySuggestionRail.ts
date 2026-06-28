import type { ActivitySuggestion } from './agentHandoffParsers';

export type ActivitySuggestionsFetchReason = 'bootstrap' | 'regenerate';

const MAX_REJECTED_TITLES = 40;
const MAX_ACTIVITY_SUGGESTIONS = 12;

export function normalizeActivitySuggestionTitle(value: string): string {
  return value.trim().toLowerCase();
}

export function buildRejectedActivitySuggestionTitles(params: {
  reason: ActivitySuggestionsFetchReason;
  currentSuggestions: ActivitySuggestion[] | null | undefined;
  dismissedTitles: string[] | null | undefined;
}): string[] {
  const existingTitles =
    params.reason === 'regenerate'
      ? (params.currentSuggestions ?? [])
          .map((suggestion) => (suggestion.title ?? '').trim())
          .filter((title) => title.length > 0)
      : [];

  return [...(params.dismissedTitles ?? []), ...existingTitles]
    .map((title) => title.trim())
    .filter((title) => title.length > 0)
    .slice(-MAX_REJECTED_TITLES);
}

function normalizeSuggestionIdSeed(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_');
}

export function prepareIncomingActivitySuggestions(params: {
  incomingSuggestions: ActivitySuggestion[] | null | undefined;
  existingSuggestions?: ActivitySuggestion[] | null;
  rejectedTitles?: string[] | null;
}): ActivitySuggestion[] | null {
  const incoming = params.incomingSuggestions && params.incomingSuggestions.length > 0 ? params.incomingSuggestions : null;
  if (!incoming) return null;

  const rejectedTitleSet = new Set((params.rejectedTitles ?? []).map(normalizeActivitySuggestionTitle));
  const filtered = incoming
    .filter((suggestion) => {
      const normalized = normalizeActivitySuggestionTitle(suggestion.title ?? '');
      return normalized.length > 0 && !rejectedTitleSet.has(normalized);
    })
    .filter((suggestion, index, array) => {
      const normalized = normalizeActivitySuggestionTitle(suggestion.title ?? '');
      const firstIndex = array.findIndex(
        (candidate) => normalizeActivitySuggestionTitle(candidate.title ?? '') === normalized,
      );
      return firstIndex === index;
    });

  if (filtered.length === 0) return null;

  const used = new Set(
    (params.existingSuggestions ?? [])
      .map((suggestion) => (suggestion.id ?? '').trim())
      .filter((id) => id.length > 0),
  );
  const collisionCounterByBase = new Map<string, number>();

  return filtered.map((suggestion) => {
    const rawId = (suggestion.id ?? '').trim();
    const rawTitle = (suggestion.title ?? '').trim();
    const titleSeed = normalizeActivitySuggestionTitle(rawTitle).slice(0, 32) || 'idea';
    const baseSeed = normalizeSuggestionIdSeed(rawId || 'suggestion');

    let nextId = rawId || baseSeed || 'suggestion';

    if (used.has(nextId)) {
      const base = normalizeSuggestionIdSeed(`${baseSeed}_${titleSeed}`);
      const start = collisionCounterByBase.get(base) ?? 0;
      let n = start;
      do {
        n += 1;
        nextId = `${base}_${n}`;
      } while (used.has(nextId));
      collisionCounterByBase.set(base, n);
    }

    used.add(nextId);
    return nextId === suggestion.id ? suggestion : { ...suggestion, id: nextId };
  });
}

export function mergeActivitySuggestionRail(params: {
  reason: ActivitySuggestionsFetchReason;
  currentSuggestions: ActivitySuggestion[] | null | undefined;
  incomingSuggestions: ActivitySuggestion[] | null | undefined;
}): ActivitySuggestion[] | null {
  if (params.reason !== 'regenerate') {
    return params.incomingSuggestions ?? null;
  }

  if (!params.incomingSuggestions || params.incomingSuggestions.length === 0) {
    return params.currentSuggestions ?? null;
  }

  const base = params.currentSuggestions ?? [];
  const seen = new Set(base.map((suggestion) => normalizeActivitySuggestionTitle(suggestion.title ?? '')));
  const merged: ActivitySuggestion[] = [...base];

  params.incomingSuggestions.forEach((suggestion) => {
    const normalized = normalizeActivitySuggestionTitle(suggestion.title ?? '');
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    merged.push(suggestion);
  });

  return merged.slice(0, MAX_ACTIVITY_SUGGESTIONS);
}
