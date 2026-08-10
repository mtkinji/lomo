import type { KrogerMatch } from '../data/krogerConnectionRepository';
import type { KrogerProduct } from '../providers/krogerProvider';
import { projectKrogerCartGroups } from './krogerCartProjection';

const butter: KrogerProduct = {
  id: 'butter-product',
  upc: '000111100001',
  title: 'Kroger Unsalted Butter Sticks',
  brand: 'Kroger',
  size: '4 sticks / 16 oz',
  thumbnailUrl: null,
  regularPriceCents: 349,
  promoPriceCents: null,
  pickupAvailable: true,
};

const matches: KrogerMatch[] = [
  { groceryItem: { id: 'butter-1', concept: 'unsalted butter', quantity: 1, unit: 'cup' }, products: [butter] },
  { groceryItem: { id: 'butter-2', concept: 'butter', quantity: 4, unit: 'tablespoon' }, products: [butter] },
];

describe('Kroger cart projection', () => {
  it('shows one retailer product and sums package quantity when grocery items match the same UPC', () => {
    expect(projectKrogerCartGroups(matches, {
      'butter-1': { product: butter, quantity: 1 },
      'butter-2': { product: butter, quantity: 1 },
    })).toEqual([
      expect.objectContaining({
        key: butter.upc,
        product: butter,
        quantity: 2,
        groceryItemIds: ['butter-1', 'butter-2'],
      }),
    ]);
  });
});
