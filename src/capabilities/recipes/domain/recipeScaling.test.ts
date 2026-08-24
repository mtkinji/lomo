import { formatKitchenQuantity, parseKitchenQuantity, scaleRecipeQuantity } from './recipeScaling';

describe('Recipe serving scaling', () => {
  test.each([
    ['1', 1], ['1.5', 1.5], ['1/2', 0.5], ['1 1/2', 1.5], ['1½', 1.5], ['¾', 0.75], ['⅙', 1 / 6],
  ])('parses %s', (text, expected) => expect(parseKitchenQuantity(text)).toBe(expected));

  it('scales a quantity and range deterministically', () => {
    expect(scaleRecipeQuantity({ quantity: 1.5, quantityMax: null, fromYield: 4, toYield: 6 }))
      .toEqual({ quantity: 2.25, quantityMax: null });
    expect(scaleRecipeQuantity({ quantity: 1, quantityMax: 2, fromYield: 4, toYield: 2 }))
      .toEqual({ quantity: 0.5, quantityMax: 1 });
  });

  it('preserves unknown quantities such as to taste', () => {
    expect(scaleRecipeQuantity({ quantity: null, quantityMax: null, fromYield: 4, toYield: 6 }))
      .toEqual({ quantity: null, quantityMax: null });
  });

  it('rejects missing, zero, or negative yields', () => {
    expect(() => scaleRecipeQuantity({ quantity: 1, quantityMax: null, fromYield: null, toYield: 2 })).toThrow('Original yield');
    expect(() => scaleRecipeQuantity({ quantity: 1, quantityMax: null, fromYield: 4, toYield: 0 })).toThrow('Target yield');
    expect(() => scaleRecipeQuantity({ quantity: -1, quantityMax: null, fromYield: 4, toYield: 2 })).toThrow('Quantity');
  });

  it('round-trips to original servings without drift', () => {
    const scaled = scaleRecipeQuantity({ quantity: 1.5, quantityMax: 2.25, fromYield: 4, toYield: 7 });
    expect(scaleRecipeQuantity({ ...scaled, fromYield: 7, toYield: 4 })).toEqual({ quantity: 1.5, quantityMax: 2.25 });
  });

  test.each([
    [1 / 6, '⅙'], [5 / 6, '⅚'], [1 + 1 / 6, '1 ⅙'],
    [0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1.5, '1 ½'], [2.25, '2 ¼'], [1.333, '1 ⅓'],
  ])('formats %s as a bounded kitchen fraction', (quantity, expected) => {
    expect(formatKitchenQuantity(quantity)).toBe(expected);
  });
});
