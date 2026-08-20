import {
  RECIPE_COMMERCE_CATALOG,
  parseRecipeCommerceCatalog,
  resolvePublishedEquipmentReview,
} from './recipeCommerceCatalog';

describe('recipe commerce catalog', () => {
  it('keeps products, retailer listings, and review picks as separately addressable objects', () => {
    const catalog = parseRecipeCommerceCatalog(RECIPE_COMMERCE_CATALOG);
    const review = resolvePublishedEquipmentReview(catalog, 'food-processor', '2026-08-20');

    expect(review).toEqual(expect.objectContaining({
      categoryId: 'food-processor',
      evidenceClass: 'editorial-review',
      substituteSummary: expect.stringContaining('knife'),
    }));
    expect(review?.picks[0]).toEqual(expect.objectContaining({
      product: expect.objectContaining({ id: 'kitchenaid-7-cup-food-processor' }),
      retailerListing: expect.objectContaining({
        id: 'amazon-us-kitchenaid-7-cup-food-processor',
        retailer: 'amazon',
        externalProductId: 'B07BW1ZPB5',
      }),
    }));
    expect(JSON.stringify(catalog)).not.toContain('amazon.com');
    expect(JSON.stringify(catalog)).not.toContain('tag=');
  });

  it('rejects a pick that points at a missing product or retailer listing', () => {
    const invalid = structuredClone(RECIPE_COMMERCE_CATALOG);
    invalid.reviewPicks[0].productId = 'missing-product';

    expect(() => parseRecipeCommerceCatalog(invalid)).toThrow(
      'reviewPicks[0].productId does not exist',
    );
  });

  it('does not publish withdrawn or stale reviews', () => {
    const withdrawn = structuredClone(RECIPE_COMMERCE_CATALOG);
    withdrawn.reviews[0].state = 'withdrawn';
    expect(resolvePublishedEquipmentReview(
      parseRecipeCommerceCatalog(withdrawn),
      'food-processor',
      '2026-08-20',
    )).toBeNull();

    expect(resolvePublishedEquipmentReview(
      parseRecipeCommerceCatalog(RECIPE_COMMERCE_CATALOG),
      'food-processor',
      '2027-01-01',
    )).toBeNull();
  });
});
