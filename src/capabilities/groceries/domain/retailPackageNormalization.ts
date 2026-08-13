export type RetailPackageResolution =
  | { state: 'normalized'; packageBaseUnits: number; baseUnit: 'count' | 'g' | 'ml'; retailQuantity: number }
  | { state: 'unknown'; reason: 'package_unparsed' | 'unit_incompatible' | 'quantity_missing' };

const MASS: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, oz: 28.349523125, ounce: 28.349523125, ounces: 28.349523125, lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237 };
const VOLUME: Record<string, number> = { ml: 1, milliliter: 1, milliliters: 1, l: 1000, liter: 1000, liters: 1000, 'fl oz': 29.5735295625, cup: 236.5882365, cups: 236.5882365, tbsp: 14.78676478125, tablespoon: 14.78676478125, tablespoons: 14.78676478125, tsp: 4.92892159375, teaspoon: 4.92892159375, teaspoons: 4.92892159375, gallon: 3785.411784, gallons: 3785.411784 };
const COUNT = new Set(['ct', 'count', 'each', 'ea', 'stick', 'sticks']);

type Measure = { amount: number; unit: string; baseUnit: 'count' | 'g' | 'ml'; baseUnits: number };

function measure(amount: number, unit: string): Measure | null {
  const normalized = unit.trim().toLowerCase().replace(/\s+/g, ' ');
  if (COUNT.has(normalized)) return { amount, unit: normalized, baseUnit: 'count', baseUnits: amount };
  if (MASS[normalized]) return { amount, unit: normalized, baseUnit: 'g', baseUnits: amount * MASS[normalized] };
  if (VOLUME[normalized]) return { amount, unit: normalized, baseUnit: 'ml', baseUnits: amount * VOLUME[normalized] };
  return null;
}

function packageMeasures(value: string): Measure[] | null {
  const text = value.trim().toLowerCase();
  const multiplied = text.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(fl oz|[a-z]+)$/);
  if (multiplied) {
    const parsed = measure(Number(multiplied[1]) * Number(multiplied[2]), multiplied[3]);
    return parsed ? [parsed] : null;
  }
  const parts = text.split('/').map((part) => part.trim());
  const parsed = parts.map((part) => {
    const match = part.match(/^(\d+(?:\.\d+)?)\s*(fl oz|[a-z]+)$/);
    return match ? measure(Number(match[1]), match[2]) : null;
  });
  if (parsed.some((item) => !item)) return null;
  const measures = parsed as Measure[];
  const families = new Map(measures.map((item) => [item.baseUnit, item]));
  if (families.size !== measures.length) return null;
  return measures;
}

export function normalizeRetailPackage(input: { packageSize: string | null; requestedQuantity: number | null; requestedUnit: string | null }): RetailPackageResolution {
  const requestedQuantity = input.requestedQuantity;
  if (!Number.isFinite(requestedQuantity) || (requestedQuantity ?? 0) <= 0 || !input.requestedUnit) return { state: 'unknown', reason: 'quantity_missing' };
  const requested = measure(requestedQuantity as number, input.requestedUnit);
  if (!requested || (requested.baseUnit === 'count' && !Number.isInteger(requestedQuantity))) return { state: 'unknown', reason: 'quantity_missing' };
  const options = input.packageSize ? packageMeasures(input.packageSize) : null;
  if (!options?.length) return { state: 'unknown', reason: 'package_unparsed' };
  const packageMeasure = options.find((option) => option.baseUnit === requested.baseUnit);
  if (!packageMeasure) return { state: 'unknown', reason: 'unit_incompatible' };
  return { state: 'normalized', packageBaseUnits: packageMeasure.baseUnits, baseUnit: packageMeasure.baseUnit, retailQuantity: Math.ceil(requested.baseUnits / packageMeasure.baseUnits) };
}
