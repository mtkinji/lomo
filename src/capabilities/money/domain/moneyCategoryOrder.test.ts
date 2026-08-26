import {
  mergeMoneyCategoryGroupOrder,
  moveMoneyCategory,
  moneyCategoryOrderChanged,
  splitMoneyCategoriesByPlanRole,
} from './moneyCategoryOrder';

describe('money category ordering', () => {
  const categories = [
    { sourceId: 'health', name: 'Health & Activities' },
    { sourceId: 'grooming', name: 'Dress and Grooming' },
    { sourceId: 'shopping', name: 'Shopping' },
  ];

  it('moves a category one accessible step without mutating the source', () => {
    expect(moveMoneyCategory(categories, 'shopping', -1).map((category) => category.sourceId))
      .toEqual(['health', 'shopping', 'grooming']);
    expect(categories.map((category) => category.sourceId))
      .toEqual(['health', 'grooming', 'shopping']);
  });

  it('leaves boundary and unknown moves unchanged', () => {
    expect(moveMoneyCategory(categories, 'health', -1)).toBe(categories);
    expect(moveMoneyCategory(categories, 'shopping', 1)).toBe(categories);
    expect(moveMoneyCategory(categories, 'missing', 1)).toBe(categories);
  });

  it('detects whether the complete order changed', () => {
    expect(moneyCategoryOrderChanged(categories, categories)).toBe(false);
    expect(moneyCategoryOrderChanged(categories, [categories[1], categories[0], categories[2]])).toBe(true);
  });

  it('splits the saved sequence into the two lists shown on Budget', () => {
    const grouped = splitMoneyCategoriesByPlanRole([
      { sourceId: 'groceries', planRole: 'flexible' as const },
      { sourceId: 'housing', planRole: 'protected' as const },
      { sourceId: 'shopping' },
      { sourceId: 'transport', planRole: 'protected' as const },
    ]);

    expect(grouped.flexible.map((category) => category.sourceId)).toEqual(['groceries', 'shopping']);
    expect(grouped.committed.map((category) => category.sourceId)).toEqual(['housing', 'transport']);
  });

  it('merges reordered groups back into the complete sequence without moving group slots', () => {
    const initial = [
      { sourceId: 'groceries', planRole: 'flexible' as const },
      { sourceId: 'housing', planRole: 'protected' as const },
      { sourceId: 'shopping', planRole: 'flexible' as const },
      { sourceId: 'transport', planRole: 'protected' as const },
    ];

    expect(mergeMoneyCategoryGroupOrder(
      initial,
      [initial[2], initial[0]],
      [initial[3], initial[1]],
    ).map((category) => category.sourceId)).toEqual([
      'shopping',
      'transport',
      'groceries',
      'housing',
    ]);
  });
});
