import type { ActivitySuggestion } from './agentHandoffParsers';
import {
  mergeActivitySuggestions,
  prepareActivitySuggestions,
} from './activitySuggestionSelection';

function suggestion(id: string, title: string): ActivitySuggestion {
  return { id, title } as ActivitySuggestion;
}

describe('activity suggestion selection', () => {
  it('removes rejected, blank, and duplicate titles', () => {
    expect(
      prepareActivitySuggestions({
        suggestions: [
          suggestion('a', ' Call Mom '),
          suggestion('b', 'call mom'),
          suggestion('c', 'Plan dinner'),
          suggestion('d', '  '),
        ],
        rejectedTitles: ['PLAN DINNER'],
      }).map((item) => item.id),
    ).toEqual(['a']);
  });

  it('repairs IDs that collide with existing suggestions or each other', () => {
    const prepared = prepareActivitySuggestions({
      suggestions: [
        suggestion('idea', 'First step'),
        suggestion('idea', 'Second step'),
        suggestion('', 'Third step'),
      ],
      existingIds: ['idea'],
    });

    expect(prepared.map((item) => item.id)).toEqual([
      'idea_first_step_1',
      'idea_second_step_1',
      'suggestion',
    ]);
  });

  it('appends only new titles and bounds the suggestion rail', () => {
    const current = Array.from({ length: 11 }, (_, index) =>
      suggestion(`current-${index}`, `Current ${index}`),
    );
    const merged = mergeActivitySuggestions(current, [
      suggestion('duplicate', ' current 0 '),
      suggestion('new-a', 'New A'),
      suggestion('new-b', 'New B'),
    ]);

    expect(merged).toHaveLength(12);
    expect(merged.at(-1)?.title).toBe('New A');
  });
});
