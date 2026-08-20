export type EquipmentReviewState = 'draft' | 'published' | 'withdrawn';
export type EquipmentEvidenceClass = 'editorial-review' | 'research-backed' | 'kwilt-tested';

export type EquipmentCommerceCategory = {
  id: string;
  label: string;
};

export type EquipmentReview = {
  id: string;
  categoryId: string;
  version: number;
  state: EquipmentReviewState;
  evidenceClass: EquipmentEvidenceClass;
  reviewedAt: string;
  reviewBy: string;
  methodology: string;
  substituteSummary: string;
  sourceUrls: Array<{ label: string; url: string }>;
};

export type CommerceProduct = {
  id: string;
  manufacturer: string;
  model: string;
  title: string;
  imageStorageRef: string | null;
  imageAlt: string;
  capacityCups: number | null;
};

export type CommerceRetailerListing = {
  id: string;
  productId: string;
  retailer: 'amazon';
  marketplace: 'US';
  externalProductId: string;
  state: 'active' | 'withdrawn';
  verifiedAt: string;
};

export type EquipmentReviewPick = {
  id: string;
  reviewId: string;
  productId: string;
  retailerListingId: string;
  role: 'lead' | 'alternative';
  position: number;
  rationale: string;
  tradeoff: string;
};

export type RecipeCommerceCatalog = {
  schemaVersion: 1;
  categories: EquipmentCommerceCategory[];
  reviews: EquipmentReview[];
  products: CommerceProduct[];
  retailerListings: CommerceRetailerListing[];
  reviewPicks: EquipmentReviewPick[];
};

export type ResolvedEquipmentReview = EquipmentReview & {
  picks: Array<EquipmentReviewPick & {
    product: CommerceProduct;
    retailerListing: CommerceRetailerListing;
  }>;
};

export const RECIPE_COMMERCE_CATALOG: RecipeCommerceCatalog = {
  schemaVersion: 1,
  categories: [{ id: 'food-processor', label: 'Food processor' }],
  reviews: [{
    id: 'food-processor-review-v1',
    categoryId: 'food-processor',
    version: 1,
    state: 'published',
    evidenceClass: 'editorial-review',
    reviewedAt: '2026-08-16',
    reviewBy: '2026-11-16',
    methodology: 'Reviewed useful capacity, everyday preparation range, storage burden, and the availability of a no-purchase hand-cutting substitute. Kwilt has not tested this product.',
    substituteSummary: 'A sharp knife works when you do not need a fine, even texture.',
    sourceUrls: [{
      label: 'KitchenAid food processors',
      url: 'https://www.kitchenaid.com/countertop-appliances/food-processors.html',
    }],
  }],
  products: [{
    id: 'kitchenaid-7-cup-food-processor',
    manufacturer: 'KitchenAid',
    model: 'KFP0718',
    title: 'KitchenAid 7-Cup Food Processor',
    imageStorageRef: null,
    imageAlt: 'Compact seven-cup food processor',
    capacityCups: 7,
  }],
  retailerListings: [{
    id: 'amazon-us-kitchenaid-7-cup-food-processor',
    productId: 'kitchenaid-7-cup-food-processor',
    retailer: 'amazon',
    marketplace: 'US',
    externalProductId: 'B07BW1ZPB5',
    state: 'active',
    verifiedAt: '2026-08-16',
  }],
  reviewPicks: [{
    id: 'food-processor-review-v1-lead',
    reviewId: 'food-processor-review-v1',
    productId: 'kitchenaid-7-cup-food-processor',
    retailerListingId: 'amazon-us-kitchenaid-7-cup-food-processor',
    role: 'lead',
    position: 0,
    rationale: 'A practical size for everyday chopping, slicing, and puréeing.',
    tradeoff: 'Seven cups suits ordinary batches, but it is too small when a Recipe explicitly requires a larger processor.',
  }],
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function requireUniqueIds(rows: readonly { id: string }[], path: string): void {
  const ids = new Set<string>();
  rows.forEach((row, index) => {
    if (!ID_PATTERN.test(row.id)) throw new Error(`${path}[${index}].id is invalid`);
    if (ids.has(row.id)) throw new Error(`${path}[${index}].id is duplicated`);
    ids.add(row.id);
  });
}

function requireDate(value: string, path: string): void {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${path} is invalid`);
  }
}

export function parseRecipeCommerceCatalog(value: unknown): RecipeCommerceCatalog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('recipeCommerceCatalog must be an object');
  }
  const catalog = value as RecipeCommerceCatalog;
  if (
    catalog.schemaVersion !== 1
    || !Array.isArray(catalog.categories)
    || !Array.isArray(catalog.reviews)
    || !Array.isArray(catalog.products)
    || !Array.isArray(catalog.retailerListings)
    || !Array.isArray(catalog.reviewPicks)
  ) throw new Error('recipeCommerceCatalog shape is invalid');

  requireUniqueIds(catalog.categories, 'categories');
  requireUniqueIds(catalog.reviews, 'reviews');
  requireUniqueIds(catalog.products, 'products');
  requireUniqueIds(catalog.retailerListings, 'retailerListings');
  requireUniqueIds(catalog.reviewPicks, 'reviewPicks');

  const categoryIds = new Set(catalog.categories.map(({ id }) => id));
  const reviews = new Map(catalog.reviews.map((review) => [review.id, review]));
  const products = new Map(catalog.products.map((product) => [product.id, product]));
  const listings = new Map(catalog.retailerListings.map((listing) => [listing.id, listing]));

  catalog.reviews.forEach((review, index) => {
    if (!categoryIds.has(review.categoryId)) throw new Error(`reviews[${index}].categoryId does not exist`);
    if (!Number.isInteger(review.version) || review.version < 1) throw new Error(`reviews[${index}].version is invalid`);
    requireDate(review.reviewedAt, `reviews[${index}].reviewedAt`);
    requireDate(review.reviewBy, `reviews[${index}].reviewBy`);
    review.sourceUrls.forEach((source, sourceIndex) => {
      if (!source.url.startsWith('https://')) throw new Error(`reviews[${index}].sourceUrls[${sourceIndex}].url is invalid`);
    });
  });

  catalog.retailerListings.forEach((listing, index) => {
    if (!products.has(listing.productId)) throw new Error(`retailerListings[${index}].productId does not exist`);
    if (!/^[A-Z0-9]{10}$/.test(listing.externalProductId)) {
      throw new Error(`retailerListings[${index}].externalProductId is invalid`);
    }
    requireDate(listing.verifiedAt, `retailerListings[${index}].verifiedAt`);
  });

  catalog.reviewPicks.forEach((pick, index) => {
    if (!reviews.has(pick.reviewId)) throw new Error(`reviewPicks[${index}].reviewId does not exist`);
    if (!products.has(pick.productId)) throw new Error(`reviewPicks[${index}].productId does not exist`);
    const listing = listings.get(pick.retailerListingId);
    if (!listing) throw new Error(`reviewPicks[${index}].retailerListingId does not exist`);
    if (listing.productId !== pick.productId) throw new Error(`reviewPicks[${index}] links different products`);
  });

  return structuredClone(catalog);
}

export function resolvePublishedEquipmentReview(
  catalog: RecipeCommerceCatalog,
  categoryId: string,
  asOf: string,
): ResolvedEquipmentReview | null {
  const review = catalog.reviews
    .filter((candidate) => (
      candidate.categoryId === categoryId
      && candidate.state === 'published'
      && candidate.reviewedAt <= asOf
      && candidate.reviewBy >= asOf
    ))
    .sort((left, right) => right.version - left.version)[0];
  if (!review) return null;

  const products = new Map(catalog.products.map((product) => [product.id, product]));
  const listings = new Map(catalog.retailerListings.map((listing) => [listing.id, listing]));
  const picks = catalog.reviewPicks
    .filter((pick) => pick.reviewId === review.id)
    .sort((left, right) => left.position - right.position)
    .flatMap((pick) => {
      const product = products.get(pick.productId);
      const retailerListing = listings.get(pick.retailerListingId);
      if (!product || !retailerListing || retailerListing.state !== 'active') return [];
      return [{ ...pick, product, retailerListing }];
    });
  return picks.length ? { ...review, picks } : null;
}
