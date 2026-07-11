import type { ActivitySuggestion } from './agentHandoffParsers';

const MAX_VISIBLE_SUGGESTIONS = 12;

export function normalizeActivitySuggestionTitle(value: string): string {
  return value.trim().toLowerCase();
}

export function prepareActivitySuggestions({
  suggestions,
  rejectedTitles = [],
  existingIds = [],
}: {
  suggestions: ActivitySuggestion[] | null | undefined;
  rejectedTitles?: Iterable<string>;
  existingIds?: Iterable<string>;
}): ActivitySuggestion[] {
  if (!suggestions?.length) return [];

  const rejected = new Set(Array.from(rejectedTitles, normalizeActivitySuggestionTitle));
  const seenTitles = new Set<string>();
  const usedIds = new Set(existingIds);
  const collisionCounterByBase = new Map<string, number>();

  return suggestions.flatMap((suggestion) => {
    const normalizedTitle = normalizeActivitySuggestionTitle(suggestion.title ?? '');
    if (!normalizedTitle || rejected.has(normalizedTitle) || seenTitles.has(normalizedTitle)) {
      return [];
    }
    seenTitles.add(normalizedTitle);

    const rawId = (suggestion.id ?? '').trim();
    const titleSeed = normalizedTitle.slice(0, 32) || 'idea';
    const baseSeed = (rawId || 'suggestion').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'suggestion';
    let nextId = rawId || baseSeed;

    if (usedIds.has(nextId)) {
      const collisionBase = `${baseSeed}_${titleSeed}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
      let collisionNumber = collisionCounterByBase.get(collisionBase) ?? 0;
      do {
        collisionNumber += 1;
        nextId = `${collisionBase}_${collisionNumber}`;
      } while (usedIds.has(nextId));
      collisionCounterByBase.set(collisionBase, collisionNumber);
    }

    usedIds.add(nextId);
    return [nextId === suggestion.id ? suggestion : { ...suggestion, id: nextId }];
  });
}

export function mergeActivitySuggestions(
  current: ActivitySuggestion[] | null | undefined,
  incoming: ActivitySuggestion[] | null | undefined,
): ActivitySuggestion[] {
  const merged = [...(current ?? [])];
  const seenTitles = new Set(
    merged.map((suggestion) => normalizeActivitySuggestionTitle(suggestion.title ?? '')),
  );

  for (const suggestion of incoming ?? []) {
    const normalizedTitle = normalizeActivitySuggestionTitle(suggestion.title ?? '');
    if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue;
    seenTitles.add(normalizedTitle);
    merged.push(suggestion);
  }

  return merged.slice(0, MAX_VISIBLE_SUGGESTIONS);
}
