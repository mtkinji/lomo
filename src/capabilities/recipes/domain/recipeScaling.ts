import { parseIngredientLine } from '@kwilt/food-core';

import type { RecipeIngredientLine } from './recipeContracts';

const vulgarFractions: Record<string, number> = {
  '⅛': 1 / 8, '⅙': 1 / 6, '¼': 1 / 4, '⅓': 1 / 3, '⅜': 3 / 8,
  '½': 1 / 2, '⅝': 5 / 8, '⅔': 2 / 3, '¾': 3 / 4, '⅚': 5 / 6, '⅞': 7 / 8,
};

const displayFractions = [
  [0, ''], [1 / 8, '⅛'], [1 / 6, '⅙'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'],
  [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [5 / 6, '⅚'], [7 / 8, '⅞'], [1, ''],
] as const;

function bounded(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

export const RECIPE_SCALE_MULTIPLIERS = [1, 2, 3] as const;

export type RecipeScaleMultiplier = (typeof RECIPE_SCALE_MULTIPLIERS)[number];

export function isRecipeScaleMultiplier(value: number): value is RecipeScaleMultiplier {
  return RECIPE_SCALE_MULTIPLIERS.some((multiplier) => multiplier === value);
}

export function multiplyRecipeQuantity(input: {
  quantity: number | null;
  quantityMax: number | null;
  multiplier: RecipeScaleMultiplier;
}): { quantity: number | null; quantityMax: number | null } {
  if (!isRecipeScaleMultiplier(input.multiplier)) {
    throw new Error('Recipe multiplier must be one of the reviewed whole-batch options.');
  }
  if ((input.quantity !== null && input.quantity < 0) || (input.quantityMax !== null && input.quantityMax < 0)) {
    throw new Error('Quantity cannot be negative.');
  }
  return {
    quantity: input.quantity === null ? null : bounded(input.quantity * input.multiplier),
    quantityMax: input.quantityMax === null ? null : bounded(input.quantityMax * input.multiplier),
  };
}

function pluralizeYieldUnit(unit: string, quantity: number): string {
  if (quantity === 1 || unit.endsWith('s')) return unit;
  if (unit.endsWith('loaf')) return `${unit.slice(0, -1)}ves`;
  if (/(?:ch|sh|x|z)$/.test(unit)) return `${unit}es`;
  return `${unit}s`;
}

export function formatScaledRecipeYield(input: {
  yieldQuantity: number;
  yieldUnit: string;
  multiplier: RecipeScaleMultiplier;
}): string {
  if (!Number.isFinite(input.yieldQuantity) || input.yieldQuantity <= 0) {
    throw new Error('Recipe yield must be greater than zero.');
  }
  if (!isRecipeScaleMultiplier(input.multiplier)) {
    throw new Error('Recipe multiplier must be one of the reviewed whole-batch options.');
  }
  const quantity = bounded(input.yieldQuantity * input.multiplier);
  return `${formatKitchenQuantity(quantity)} ${pluralizeYieldUnit(input.yieldUnit.trim(), quantity)}`;
}

function unitForDisplay(unit: string | null, quantity: number, quantityMax: number | null): string {
  if (!unit || unit === 'count') return '';
  const plural = (quantityMax ?? quantity) > 1;
  if (!plural || unit.endsWith('s')) return unit;
  if (unit.endsWith('ch')) return `${unit}es`;
  return `${unit}s`;
}

function preserveAuthoredCase(originalText: string, parsedText: string | null): string | null {
  if (!parsedText) return parsedText;
  const start = originalText.toLocaleLowerCase().indexOf(parsedText.toLocaleLowerCase());
  return start >= 0 ? originalText.slice(start, start + parsedText.length) : parsedText;
}

function preserveAuthoredParentheticals(originalText: string, concept: string | null): string | null {
  if (!concept) return concept;
  const conceptStart = originalText.toLocaleLowerCase().indexOf(concept.toLocaleLowerCase());
  if (conceptStart < 0) return concept;
  const parentheticals = originalText.slice(0, conceptStart).match(/\([^)]*\)/g);
  return parentheticals?.length ? `${parentheticals.join(' ')} ${concept}` : concept;
}

function scaleParentheticalMassEquivalent(text: string, multiplier: RecipeScaleMultiplier): string {
  return text.replace(
    /\((\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+|[⅛⅙¼⅓⅜½⅝⅔¾⅚⅞])\s*(grams?|g|kilograms?|kg|ounces?|oz|pounds?|lbs?|lb)\)/gi,
    (match, rawQuantity: string, unit: string) => {
      const quantity = parseKitchenQuantity(rawQuantity);
      if (quantity === null) return match;
      const scaled = bounded(quantity * multiplier);
      const displayUnit = /^(?:g|kg|oz|lb|lbs)$/i.test(unit)
        ? unit
        : unitForDisplay(unit.replace(/s$/i, ''), scaled, null);
      return `(${formatKitchenQuantity(scaled)} ${displayUnit})`;
    },
  );
}

export function scaledIngredientDisplay(
  line: RecipeIngredientLine,
  multiplier: RecipeScaleMultiplier,
): string {
  if (multiplier === 1 || line.scaleRule.kind !== 'multiply') return line.originalText;
  const parsed = line.ingredientConcept ? null : parseIngredientLine(line.originalText);
  const quantityMin = line.quantityMin ?? parsed?.quantityMin ?? null;
  const quantityMax = line.quantityMax ?? parsed?.quantityMax ?? null;
  const authoredConcept = line.ingredientConcept?.trim()
    || preserveAuthoredCase(line.originalText, parsed?.concept.trim() ?? null);
  let concept = preserveAuthoredParentheticals(line.originalText, authoredConcept);
  const quantityIsReliable = line.ingredientConcept
    ? (line.parseConfidence ?? 0) >= 0.8
    : parsed?.quantityMin !== null;
  if (quantityMin === null || !concept || !quantityIsReliable) return line.originalText;
  const scaled = multiplyRecipeQuantity({ quantity: quantityMin, quantityMax, multiplier });
  if (scaled.quantity === null) return line.originalText;
  const unit = line.unit ?? parsed?.unit ?? null;
  if (unit !== 'count') concept = scaleParentheticalMassEquivalent(concept, multiplier);
  const displayUnit = unitForDisplay(unit, scaled.quantity, scaled.quantityMax);
  const amount = `${formatKitchenQuantity(scaled.quantity)}${scaled.quantityMax === null ? '' : `–${formatKitchenQuantity(scaled.quantityMax)}`}${displayUnit ? ` ${displayUnit}` : ''}`;
  const preparation = line.preparation
    ?? preserveAuthoredCase(line.originalText, parsed?.preparation ?? null);
  return `${amount} ${concept}${preparation ? `, ${preparation}` : ''}${line.optional ? ' (optional)' : ''}`;
}

export function scaledIngredientAmount(
  line: RecipeIngredientLine,
  multiplier: RecipeScaleMultiplier,
): string | null {
  const display = scaledIngredientDisplay(line, multiplier);
  const parsed = parseIngredientLine(display);
  const concept = parsed.concept.trim();
  if (!concept) return null;
  const conceptStart = display.toLocaleLowerCase().indexOf(concept.toLocaleLowerCase());
  return conceptStart > 0 ? display.slice(0, conceptStart).trim() || null : null;
}

export function parseKitchenQuantity(text: string): number | null {
  const normalized = text.trim();
  if (!normalized) return null;
  const vulgar = normalized.match(/^(\d+)?\s*([⅛⅙¼⅓⅜½⅝⅔¾⅚⅞])/);
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
