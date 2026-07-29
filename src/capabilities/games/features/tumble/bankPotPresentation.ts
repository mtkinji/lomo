export type PotTier = 'small' | 'building' | 'maximum';
export type PotSizeMode = 'portrait' | 'broadcast' | 'compact';
export type SevenOutEffect = 'poof' | 'rattle' | 'explosion' | 'catastrophe';

export type SevenOutPiece = {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
  round: boolean;
};

export function potTier(pot: number): PotTier {
  if (pot < 25) return 'small';
  if (pot < 75) return 'building';
  return 'maximum';
}

const fontSizes: Record<PotSizeMode, Record<PotTier, number>> = {
  portrait: { small: 36, building: 44, maximum: 52 },
  broadcast: { small: 52, building: 62, maximum: 72 },
  compact: { small: 42, building: 50, maximum: 56 },
};

export function potFontSize(tier: PotTier, mode: PotSizeMode) {
  return fontSizes[mode][tier];
}

export function formatPotValue(pot: number) {
  return Math.max(0, Math.trunc(pot)).toLocaleString('en-US');
}

const fitRules: Record<PotSizeMode, { capacity: number; minimum: number }> = {
  portrait: { capacity: 8, minimum: 30 },
  broadcast: { capacity: 12, minimum: 42 },
  compact: { capacity: 9, minimum: 34 },
};

export function fittedPotFontSize(pot: number, mode: PotSizeMode) {
  const base = potFontSize(potTier(pot), mode);
  const { capacity, minimum } = fitRules[mode];
  const length = formatPotValue(pot).length;
  return Math.max(minimum, Math.floor(base * Math.min(1, capacity / length)));
}

export function sevenOutEffect(lostPot: number): SevenOutEffect {
  if (lostPot < 50) return 'poof';
  if (lostPot < 100) return 'rattle';
  if (lostPot < 1_000) return 'explosion';
  return 'catastrophe';
}

export function createSevenOutPieces(effect: SevenOutEffect): SevenOutPiece[] {
  const count = effect === 'poof' ? 7 : effect === 'explosion' ? 14 : effect === 'catastrophe' ? 22 : 0;
  return Array.from({ length: count }, (_, id) => {
    const direction = id % 2 === 0 ? -1 : 1;
    const spread = effect === 'poof' ? 18 + ((id * 7) % 20) : 38 + ((id * 17) % (effect === 'catastrophe' ? 92 : 62));
    return {
      id,
      x: direction * spread,
      y: -(18 + ((id * 23) % (effect === 'catastrophe' ? 96 : 64))),
      delay: (id % 5) * 24,
      duration: 420 + ((id * 41) % 220),
      size: effect === 'poof' ? 18 + ((id * 5) % 18) : 7 + ((id * 3) % 8),
      round: effect === 'poof' || id % 3 === 0,
    };
  });
}
