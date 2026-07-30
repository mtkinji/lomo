import { createConfettiPieces } from '../confetti';

describe('createConfettiPieces', () => {
  test('creates a staggered field that bursts before it falls', () => {
    const pieces = createConfettiPieces();

    expect(pieces).toHaveLength(40);
    expect(new Set(pieces.map((piece) => piece.delay)).size).toBeGreaterThan(4);
    expect(new Set(pieces.map((piece) => piece.originTop)).size).toBeGreaterThan(3);
    expect(pieces.some((piece) => piece.burstX < 0)).toBe(true);
    expect(pieces.some((piece) => piece.burstX > 0)).toBe(true);
    expect(pieces.every((piece) => piece.burstY < 0)).toBe(true);
    expect(pieces.every((piece) => piece.fallY > 600)).toBe(true);
  });
});
