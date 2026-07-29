import {
  createSevenOutPieces,
  fittedPotFontSize,
  formatPotValue,
  potFontSize,
  potTier,
  sevenOutEffect,
} from '../bankPotPresentation';

describe('Bank pot presentation', () => {
  test.each([
    [0, 'small'],
    [24, 'small'],
    [25, 'building'],
    [74, 'building'],
    [75, 'maximum'],
    [987_654_321, 'maximum'],
  ] as const)('maps %i into the capped %s tier', (pot, tier) => {
    expect(potTier(pot)).toBe(tier);
  });

  test('caps visual growth while keeping responsive sizes', () => {
    expect(potFontSize('small', 'portrait')).toBe(36);
    expect(potFontSize('maximum', 'portrait')).toBe(52);
    expect(potFontSize('maximum', 'broadcast')).toBe(72);
    expect(potFontSize('maximum', 'compact')).toBe(56);
  });

  test('preserves exact exceptional values with grouping separators', () => {
    expect(formatPotValue(987_654_321)).toBe('987,654,321');
    expect(fittedPotFontSize(987_654_321, 'portrait')).toBeLessThan(52);
    expect(fittedPotFontSize(Number.MAX_SAFE_INTEGER, 'portrait')).toBeGreaterThanOrEqual(30);
  });

  test.each([
    [49, 'poof'],
    [50, 'rattle'],
    [99, 'rattle'],
    [100, 'explosion'],
    [999, 'explosion'],
    [1_000, 'catastrophe'],
    [250_000, 'catastrophe'],
  ] as const)('maps %i points to %s theater', (pot, effect) => {
    expect(sevenOutEffect(pot)).toBe(effect);
  });

  test('makes larger losses more theatrical without unbounded particles', () => {
    expect(createSevenOutPieces('poof')).toHaveLength(7);
    expect(createSevenOutPieces('rattle')).toHaveLength(0);
    expect(createSevenOutPieces('explosion')).toHaveLength(14);
    expect(createSevenOutPieces('catastrophe')).toHaveLength(22);
    expect(createSevenOutPieces('catastrophe').some((piece) => piece.x < 0)).toBe(true);
    expect(createSevenOutPieces('catastrophe').some((piece) => piece.x > 0)).toBe(true);
  });
});
