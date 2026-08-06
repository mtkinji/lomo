import { moveMoneyCategory, moneyCategoryOrderChanged } from './moneyCategoryOrder';

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
});
