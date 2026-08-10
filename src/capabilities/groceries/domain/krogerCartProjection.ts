import type { KrogerMatch } from '../data/krogerConnectionRepository';
import type { KrogerProduct } from '../providers/krogerProvider';

export type KrogerCartLine = { product: KrogerProduct; quantity: number };
export type KrogerCartSelection = Record<string, KrogerCartLine>;

export type KrogerCartGroup = {
  key: string;
  product: KrogerProduct;
  quantity: number;
  groceryItemIds: string[];
  matches: KrogerMatch[];
};

export function projectKrogerCartGroups(
  matches: KrogerMatch[],
  selection: KrogerCartSelection,
): KrogerCartGroup[] {
  const groups = new Map<string, KrogerCartGroup>();

  for (const match of matches) {
    const line = selection[match.groceryItem.id];
    if (!line) continue;
    const key = line.product.upc.trim() || line.product.id;
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
