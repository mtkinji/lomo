import { buildGroceryCompilation, parseIngredientLine, parseQuantity, stableContentHash, verifyIdempotentReplay } from './index';

describe('food-core conservative compiler', () => {
  it('parses sixths used by serving-scaled recipe displays', () => {
    expect(parseIngredientLine('⅙ teaspoon black pepper')).toEqual(expect.objectContaining({
      quantityMin: 1 / 6,
      unit: 'teaspoon',
      concept: 'black pepper',
    }));
  });

  test.each([
    ['1 1/2 cups flour', { quantityMin: 1.5, quantityMax: null }],
    ['1-2 onions', { quantityMin: 1, quantityMax: 2 }],
    ['½ teaspoon salt', { quantityMin: 0.5, quantityMax: null }],
    ['one 14-ounce can tomatoes', { quantityMin: 1, quantityMax: null, packageQuantity: 14, packageUnit: 'ounce' }],
  ])('parses %s', (line, expected) => expect(parseQuantity(line)).toEqual(expect.objectContaining(expected)));

  test.each([
    ['500g carrots', { quantityMin: 500, unit: 'gram', concept: 'carrots' }],
    ['250–500ml milk', { quantityMin: 250, quantityMax: 500, unit: 'milliliter', concept: 'milk' }],
    ['1 to 2 cups rice', { quantityMin: 1, quantityMax: 2, unit: 'cup', concept: 'rice' }],
    ['1.5 litres water', { quantityMin: 1.5, unit: 'liter', concept: 'water' }],
  ])('keeps metric amounts and range endpoints for %s', (text, expected) => {
    expect(parseIngredientLine(text)).toEqual(expect.objectContaining(expected));
  });

  test.each(['1 1/0 cups flour', '1/0 cups flour', '2–1 cups flour'])('does not invent an amount for invalid quantity %s', (text) => {
    expect(parseIngredientLine(text).quantityMin).toBeNull();
  });

  it('adds a range to an exact amount without double-counting the lower endpoint', () => {
    const first = buildGroceryCompilation([line('1 cup rice', 'r1', 'i1'), line('2–3 cups rice', 'r2', 'i2')]);
    const reverse = buildGroceryCompilation([line('2–3 cups rice', 'r2', 'i2'), line('1 cup rice', 'r1', 'i1')]);
    expect(first.items[0]).toEqual(expect.objectContaining({ quantityMin: 3, quantityMax: 4 }));
    expect(reverse.items[0]).toEqual(expect.objectContaining({ quantityMin: 3, quantityMax: 4 }));
  });

  it('merges metric volumes with exact source quantities', () => {
    const result = buildGroceryCompilation([line('1 liter milk', 'r1', 'i1'), line('500ml milk', 'r2', 'i2')]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(expect.objectContaining({ quantityMin: 1.5, unit: 'liter' }));
  });

  it('preserves count separately from package weight', () => {
    expect(parseIngredientLine('2 14-ounce cans tomatoes')).toEqual(expect.objectContaining({ quantityMin: 2, unit: 'count', packageQuantity: 14, packageUnit: 'ounce', concept: 'tomatoes' }));
    expect(parseIngredientLine('1 can (14 ounces) tomatoes, drained')).toEqual(expect.objectContaining({ quantityMin: 1, unit: 'count', packageQuantity: 14, packageUnit: 'ounce', concept: 'tomatoes', preparation: 'drained' }));
  });

  it('keeps parenthetical metric equivalents out of the ingredient concept', () => {
    expect(parseIngredientLine('3 1/2 cups (420 grams) all-purpose flour, plus more as needed')).toEqual(expect.objectContaining({
      quantityMin: 3.5,
      unit: 'cup',
      concept: 'all-purpose flour',
      preparation: 'plus more as needed',
    }));
  });

  it('merges only exact concepts with compatible units and preparation', () => {
    const result = buildGroceryCompilation([
      line('1 cup carrots, chopped', 'r1', 'i1'),
      line('8 tablespoons carrots, chopped', 'r2', 'i2'),
      line('1 cup carrots, whole', 'r3', 'i3'),
      line('salt to taste', 'r1', 'i4'),
    ]);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toEqual(expect.objectContaining({ concept: 'carrots', quantityMin: 1.5, unit: 'cup', preparation: 'chopped' }));
    expect(result.items[0].sources).toHaveLength(2);
    expect(result.items[0].sources).toEqual([
      expect.objectContaining({ recipeVersionId: 'r1', quantityMin: 1, quantityMax: null, unit: 'cup', optional: false }),
      expect.objectContaining({ recipeVersionId: 'r2', quantityMin: 0.5, quantityMax: null, unit: 'cup', optional: false }),
    ]);
    expect(result.items.find((item) => item.preparation === 'whole')).toEqual(expect.objectContaining({ quantityMin: 1 }));
    expect(result.items.find((item) => item.concept === 'salt')).toEqual(expect.objectContaining({ quantityMin: null, reviewReason: 'Quantity needs review' }));
  });

  it('keeps optional garnish and incompatible units separate with provenance', () => {
    const result = buildGroceryCompilation([
      line('2 bunches cilantro', 'r1', 'i1'),
      { ...line('1 cup cilantro, for garnish', 'r2', 'i2'), optional: true },
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.sources[0].ingredientLineId)).toBe(true);
  });

  it('scales structured quantities by an explicit recipe multiplier', () => {
    const result = buildGroceryCompilation([{ ...line('2 onions', 'r1', 'i1'), recipeScaleMultiplier: 3 }]);
    expect(result.items[0]).toEqual(expect.objectContaining({ quantityMin: 6, aisle: 'produce' }));
  });

  it('hashes semantic content deterministically regardless of object key order', () => {
    expect(stableContentHash({ planId: 'p1', version: 2, selected: ['a'] }))
      .toBe(stableContentHash({ selected: ['a'], version: 2, planId: 'p1' }));
    expect(stableContentHash({ planId: 'p1', version: 3, selected: ['a'] }))
      .not.toBe(stableContentHash({ planId: 'p1', version: 2, selected: ['a'] }));
  });

  it('replays the same idempotent payload and rejects same-key different-payload', () => {
    const existing = { idempotencyKey: 'compile:p1:v2', contentHash: 'sha256:a' };
    expect(verifyIdempotentReplay(existing, { ...existing })).toBe('replay');
    expect(() => verifyIdempotentReplay(existing, { ...existing, contentHash: 'sha256:b' }))
      .toThrow(expect.objectContaining({ code: 'food.idempotency_conflict' }));
    expect(verifyIdempotentReplay(existing, { idempotencyKey: 'compile:p1:v3', contentHash: 'sha256:b' })).toBe('new');
  });
});

function line(originalText: string, recipeVersionId: string, ingredientLineId: string) {
  return { originalText, recipeVersionId, ingredientLineId, planEntryId: `entry-${recipeVersionId}`, recipeScaleMultiplier: 1, optional: false };
}
