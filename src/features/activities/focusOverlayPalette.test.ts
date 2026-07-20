import { focusOverlayColorKeyForIndex } from './focusOverlayPalette';

describe('focusOverlayColorKeyForIndex', () => {
  it.each([
    [0, 'pine'],
    [1, 'madder'],
    [2, 'orange'],
    [3, 'turmeric'],
    [4, 'blue'],
    [5, 'indigo'],
    [6, 'violet'],
    [7, 'pine'],
  ] as const)('maps persisted palette index %s to %s', (index, expected) => {
    expect(focusOverlayColorKeyForIndex(index)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'falls back to pine for invalid index %s',
    (index) => {
      expect(focusOverlayColorKeyForIndex(index)).toBe('pine');
    },
  );
});
