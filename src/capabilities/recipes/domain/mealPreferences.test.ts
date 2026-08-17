import {
  clampDefaultMealServings,
  resolveCandidateMealServings,
  resolveDefaultMealServings,
  resolveSuggestedMealServings,
} from './mealPreferences';

describe('meal preferences', () => {
  it('defaults to four servings when no preference exists', () => {
    expect(resolveDefaultMealServings(undefined)).toBe(4);
  });

  it('keeps the default in a useful household range', () => {
    expect(clampDefaultMealServings(0)).toBe(1);
    expect(clampDefaultMealServings(25)).toBe(20);
    expect(clampDefaultMealServings(6)).toBe(6);
  });

  it('preserves a serving choice already attached to a planned recipe', () => {
    expect(resolveCandidateMealServings({ selectedServings: 7 }, 4)).toBe(7);
    expect(resolveCandidateMealServings(null, 4)).toBe(4);
  });

  it('derives quantity from selected diners without adult or kid classes', () => {
    expect(resolveSuggestedMealServings({ selectedServings: 7, usualDinerPersonIds: ['a', 'b'] })).toBe(7);
    expect(resolveSuggestedMealServings({ usualDinerCount: 7, usualDinerPersonIds: ['a', 'b'], numericFallback: 6 })).toBe(7);
    expect(resolveSuggestedMealServings({ usualDinerPersonIds: ['a', 'b', 'c'], numericFallback: 6 })).toBe(3);
    expect(resolveSuggestedMealServings({ numericFallback: 6 })).toBe(6);
  });
});
