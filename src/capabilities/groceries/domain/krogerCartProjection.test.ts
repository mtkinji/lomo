import type { KrogerMatch } from '../data/krogerConnectionRepository';
import type { KrogerProduct } from '../providers/krogerProvider';
import {
  getKrogerCartGroupAlternatives,
  projectKrogerCartGroups,
  resolveKrogerRetailQuantity,
} from './krogerCartProjection';

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

  it('offers only alternatives returned for every grocery need in a consolidated row', () => {
    const sharedAlternative: KrogerProduct = {
      ...butter,
      id: 'shared-alternative',
      upc: '000111100002',
      title: 'Simple Truth Butter',
    };
    const firstOnly: KrogerProduct = {
      ...butter,
      id: 'first-only',
      upc: '000111100003',
      title: 'First search only',
    };
    const grouped = projectKrogerCartGroups([
      { ...matches[0], products: [butter, sharedAlternative, firstOnly] },
      { ...matches[1], products: [butter, sharedAlternative] },
    ], {
      'butter-1': { product: butter, quantity: 1 },
      'butter-2': { product: butter, quantity: 1 },
    })[0];

    expect(getKrogerCartGroupAlternatives(grouped)).toEqual([butter, sharedAlternative]);
  });

  it('projects an exact retail package quantity only when units are compatible', () => {
    const countMatch: KrogerMatch = { groceryItem: { id: 'eggs', concept: 'eggs', quantity: 18, unit: 'count' }, products: [{ ...butter, size: '12 ct' }] };
    expect(resolveKrogerRetailQuantity(countMatch, countMatch.products[0])).toEqual(expect.objectContaining({ state: 'normalized', retailQuantity: 2 }));
    expect(resolveKrogerRetailQuantity(matches[0], butter)).toEqual({ state: 'unknown', reason: 'unit_incompatible' });
  });
});
