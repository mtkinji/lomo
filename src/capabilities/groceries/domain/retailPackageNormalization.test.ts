import { normalizeRetailPackage } from './retailPackageNormalization';

describe('retail package normalization', () => {
  it.each([
    ['12 ct', 18, 'count', 2, 'count'],
    ['64 fl oz', 1, 'gallon', 2, 'ml'],
    ['2 x 16 oz', 3, 'lb', 2, 'g'],
    ['5 lb', 6, 'lb', 2, 'g'],
    ['4 sticks / 16 oz', 24, 'oz', 2, 'g'],
  ] as const)('normalizes %s conservatively', (packageSize, requestedQuantity, requestedUnit, retailQuantity, baseUnit) => {
    expect(normalizeRetailPackage({ packageSize, requestedQuantity, requestedUnit })).toEqual(expect.objectContaining({ state: 'normalized', retailQuantity, baseUnit }));
  });

  it.each([
    [{ packageSize: 'family size', requestedQuantity: 1, requestedUnit: 'count' }, 'package_unparsed'],
    [{ packageSize: '1 package', requestedQuantity: 1, requestedUnit: 'count' }, 'package_unparsed'],
    [{ packageSize: '12 oz / 1 lb', requestedQuantity: 1, requestedUnit: 'oz' }, 'package_unparsed'],
    [{ packageSize: '12 ct', requestedQuantity: 1.5, requestedUnit: 'count' }, 'quantity_missing'],
    [{ packageSize: '12 ct', requestedQuantity: null, requestedUnit: 'count' }, 'quantity_missing'],
    [{ packageSize: '12 ct', requestedQuantity: 1, requestedUnit: 'oz' }, 'unit_incompatible'],
  ] as const)('refuses ambiguous or unsafe input', (input, reason) => {
    expect(normalizeRetailPackage(input)).toEqual({ state: 'unknown', reason });
  });
});
