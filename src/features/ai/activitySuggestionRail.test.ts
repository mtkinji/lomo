import type { ActivitySuggestion } from './agentHandoffParsers';
import {
  buildRejectedActivitySuggestionTitles,
  mergeActivitySuggestionRail,
  normalizeActivitySuggestionTitle,
  prepareIncomingActivitySuggestions,
} from './activitySuggestionRail';

const suggestion = (overrides: Partial<ActivitySuggestion>): ActivitySuggestion => ({
  id: overrides.id ?? 'suggestion',
  title: overrides.title ?? 'Take one step',
  ...overrides,
});

describe('activitySuggestionRail', () => {
  it('normalizes titles for matching without changing display titles', () => {
    expect(normalizeActivitySuggestionTitle('  Call Sam  ')).toBe('call sam');
  });

  it('builds rejected titles from dismissed and current regenerate suggestions', () => {
    const rejected = buildRejectedActivitySuggestionTitles({
      reason: 'regenerate',
      currentSuggestions: [suggestion({ title: 'Existing one' })],
      dismissedTitles: ['Dismissed one', '  '],
    });

    expect(rejected).toEqual(['Dismissed one', 'Existing one']);
  });

  it('filters rejected and duplicate incoming suggestions, then resolves id collisions', () => {
    const prepared = prepareIncomingActivitySuggestions({
      incomingSuggestions: [
        suggestion({ id: 'a', title: 'Dismissed one' }),
        suggestion({ id: 'a', title: 'Fresh idea' }),
        suggestion({ id: 'b', title: 'Fresh idea' }),
        suggestion({ id: '', title: 'No id survives parser fallback' }),
      ],
      existingSuggestions: [suggestion({ id: 'a', title: 'Existing one' })],
      rejectedTitles: ['Dismissed one'],
    });

    expect(prepared).toEqual([
      suggestion({ id: 'a_fresh_idea_1', title: 'Fresh idea' }),
      suggestion({ id: 'suggestion', title: 'No id survives parser fallback' }),
    ]);
  });

  it('replaces suggestions on bootstrap and appends unique suggestions on regenerate', () => {
    const current = [suggestion({ id: 'a', title: 'Existing one' })];
    const incoming = [
      suggestion({ id: 'b', title: 'Existing one' }),
      suggestion({ id: 'c', title: 'New one' }),
    ];

    expect(
      mergeActivitySuggestionRail({
        reason: 'bootstrap',
        currentSuggestions: current,
        incomingSuggestions: incoming,
      }),
    ).toEqual(incoming);

    expect(
      mergeActivitySuggestionRail({
        reason: 'regenerate',
        currentSuggestions: current,
        incomingSuggestions: incoming,
      }),
    ).toEqual([current[0], incoming[1]]);
  });

  it('keeps the regenerated rail bounded', () => {
    const current = Array.from({ length: 11 }, (_, index) =>
      suggestion({ id: `current-${index}`, title: `Current ${index}` }),
    );
    const incoming = [
      suggestion({ id: 'new-1', title: 'New 1' }),
      suggestion({ id: 'new-2', title: 'New 2' }),
    ];

    expect(
      mergeActivitySuggestionRail({
        reason: 'regenerate',
        currentSuggestions: current,
        incomingSuggestions: incoming,
      }),
    ).toHaveLength(12);
  });
});
