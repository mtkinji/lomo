const vulgarFractions: Record<string, number> = {
  '⅛': 1 / 8, '¼': 1 / 4, '⅓': 1 / 3, '⅜': 3 / 8,
  '½': 1 / 2, '⅝': 5 / 8, '⅔': 2 / 3, '¾': 3 / 4, '⅞': 7 / 8,
};

const displayFractions = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'],
  [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, ''],
] as const;

function bounded(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export function parseKitchenQuantity(text: string): number | null {
  const normalized = text.trim();
  if (!normalized) return null;
  const vulgar = normalized.match(/^(\d+)?\s*([⅛¼⅓⅜½⅝⅔¾⅞])/);
  if (vulgar) return Number(vulgar[1] ?? 0) + vulgarFractions[vulgar[2]];
  const mixed = normalized.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixed && Number(mixed[3]) !== 0) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = normalized.match(/^(\d+)\/(\d+)/);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
  const decimal = normalized.match(/^\d+(?:\.\d+)?/);
  return decimal ? Number(decimal[0]) : null;
}

export function scaleRecipeQuantity(input: {
  quantity: number | null;
  quantityMax: number | null;
  fromYield: number | null;
  toYield: number;
}): { quantity: number | null; quantityMax: number | null } {
  if (input.fromYield === null || !Number.isFinite(input.fromYield) || input.fromYield <= 0) {
    throw new Error('Original yield must be known and greater than zero.');
  }
  if (!Number.isFinite(input.toYield) || input.toYield <= 0) {
    throw new Error('Target yield must be greater than zero.');
  }
  if ((input.quantity !== null && input.quantity < 0) || (input.quantityMax !== null && input.quantityMax < 0)) {
    throw new Error('Quantity cannot be negative.');
  }
  const factor = input.toYield / input.fromYield;
  return {
    quantity: input.quantity === null ? null : bounded(input.quantity * factor),
    quantityMax: input.quantityMax === null ? null : bounded(input.quantityMax * factor),
  };
}

export function formatKitchenQuantity(quantity: number): string {
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Quantity must be a finite non-negative number.');
  let whole = Math.floor(quantity);
  const remainder = quantity - whole;
  let nearest: readonly [number, string] = displayFractions[0];
  for (const candidate of displayFractions) {
    if (Math.abs(candidate[0] - remainder) < Math.abs(nearest[0] - remainder)) nearest = candidate;
  }
  if (nearest[0] === 1) {
    whole += 1;
    nearest = displayFractions[0];
  }
  if (Math.abs(nearest[0] - remainder) > 0.035) return String(bounded(quantity));
  if (!nearest[1]) return String(whole);
  return whole > 0 ? `${whole} ${nearest[1]}` : nearest[1];
}
