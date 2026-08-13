import type { KrogerMatch } from '../data/krogerConnectionRepository';
import type { KrogerProduct } from '../providers/krogerProvider';
import { normalizeRetailPackage, type RetailPackageResolution } from './retailPackageNormalization';

export type KrogerCartLine = { product: KrogerProduct; quantity: number };
export type KrogerCartSelection = Record<string, KrogerCartLine>;

export type KrogerCartGroup = {
  key: string;
  product: KrogerProduct;
  quantity: number;
  groceryItemIds: string[];
  matches: KrogerMatch[];
};

const productKey = (product: KrogerProduct) => product.upc.trim() || product.id;

export function resolveKrogerRetailQuantity(match: KrogerMatch, product: KrogerProduct): RetailPackageResolution {
  return normalizeRetailPackage({ packageSize: product.size ?? null, requestedQuantity: match.groceryItem.quantity, requestedUnit: match.groceryItem.unit });
}

export function getKrogerCartGroupAlternatives(group: KrogerCartGroup): KrogerProduct[] {
  const [firstMatch, ...remainingMatches] = group.matches;
  if (!firstMatch) return [];

  const availableInEveryMatch = remainingMatches.map(
    (match) => new Set(match.products.map(productKey)),
  );
  const seen = new Set<string>();

  return firstMatch.products.filter((product) => {
    const key = productKey(product);
    if (seen.has(key) || availableInEveryMatch.some((keys) => !keys.has(key))) return false;
    seen.add(key);
    return true;
  });
}

export function projectKrogerCartGroups(
  matches: KrogerMatch[],
  selection: KrogerCartSelection,
): KrogerCartGroup[] {
  const groups = new Map<string, KrogerCartGroup>();

  for (const match of matches) {
    const line = selection[match.groceryItem.id];
    if (!line) continue;
    const key = productKey(line.product);
    const existing = groups.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      existing.groceryItemIds.push(match.groceryItem.id);
      existing.matches.push(match);
      continue;
    }
    groups.set(key, {
      key,
      product: line.product,
      quantity: line.quantity,
      groceryItemIds: [match.groceryItem.id],
      matches: [match],
    });
  }

  return [...groups.values()];
}
