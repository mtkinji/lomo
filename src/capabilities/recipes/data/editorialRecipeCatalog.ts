export type EditorialRecipeCategory =
  | 'Breakfast & brunch'
  | 'Lunch & handhelds'
  | 'Dinner'
  | 'Soups & stews'
  | 'Salads & bowls'
  | 'Appetizers & snacks'
  | 'Sides'
  | 'Breads & baking'
  | 'Desserts';

export type EditorialRecipeTier = 'household-anchor' | 'cuisine-anchor' | 'discovery';
export type KitchenTestState = 'desk-reviewed' | 'cooked-once' | 'repeat-validated';

export type EditorialResearchSource = {
  publisher: string;
  title: string;
  url: string;
  rating: number | null;
  ratingCount: number | null;
  signal: string;
};

export type EditorialRecipe = {
  rosterId: string;
  title: string;
  description: string;
  category: EditorialRecipeCategory;
  cuisine: string;
  tier: EditorialRecipeTier;
  yieldQuantity: number;
  yieldUnit: string;
  prepMinutes: number;
  cookMinutes: number;
  inactiveMinutes: number;
  ingredients: readonly string[];
  instructions: readonly string[];
  notes: string;
  artworkIndex: number;
  kitchenTestState: KitchenTestState;
  kitchenTestNotes?: readonly string[];
  research: {
    accessedAt: string;
    sources: readonly EditorialResearchSource[];
    nonNegotiableTechniques: readonly string[];
    repeatedSuccessSignals: readonly string[];
    repeatedFailureRisks: readonly string[];
    adaptationDecision: string;
  };
};

export function validateEditorialRecipe(recipe: EditorialRecipe): string[] {
  const errors: string[] = [];
  const label = recipe.rosterId || recipe.title || 'Recipe';

  if (!/^(BR|LU|DI|SO|SA|AP|SI|BA|DE)\d{3}$/.test(recipe.rosterId)) {
    errors.push(`${label} must have a valid roster id`);
  }
  if (recipe.ingredients.length < 5) errors.push(`${label} must have at least 5 ingredients`);
  if (recipe.instructions.length < 4) errors.push(`${label} must have at least 4 instructions`);
  if (recipe.research.sources.length < 3) errors.push(`${label} must have at least 3 research sources`);
  if (recipe.prepMinutes < 0 || recipe.cookMinutes < 0 || recipe.inactiveMinutes < 0) {
    errors.push(`${label} minutes must be non-negative`);
  }
  if (recipe.yieldQuantity <= 0 || !recipe.yieldUnit.trim()) errors.push(`${label} must have a positive yield`);
  if (recipe.artworkIndex < 0 || recipe.artworkIndex >= 24 || !Number.isInteger(recipe.artworkIndex)) {
    errors.push(`${label} artworkIndex must reference the bundled atlas`);
  }

  if (recipe.kitchenTestState !== 'desk-reviewed' && !(recipe.kitchenTestNotes?.length)) {
    errors.push(`${label} cannot claim ${recipe.kitchenTestState} without kitchen test notes`);
  }

  const sourceUrls = new Set<string>();
  recipe.research.sources.forEach((source, index) => {
    const sourceLabel = `${label} source ${index + 1}`;
    if (!/^https:\/\//.test(source.url)) errors.push(`${sourceLabel} must use an https URL`);
    if (sourceUrls.has(source.url)) errors.push(`${sourceLabel} duplicates another source URL`);
    sourceUrls.add(source.url);
    if (source.rating !== null && (source.rating < 0 || source.rating > 5)) {
      errors.push(`${sourceLabel} rating must be between 0 and 5`);
    }
    if (source.ratingCount !== null && source.ratingCount < 0) {
      errors.push(`${sourceLabel} ratingCount must be non-negative`);
    }
    if (!source.publisher.trim() || !source.title.trim() || !source.signal.trim()) {
      errors.push(`${sourceLabel} must include publisher, title, and signal`);
    }
  });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(recipe.research.accessedAt)) {
    errors.push(`${label} research accessedAt must be YYYY-MM-DD`);
  }
  if (!recipe.research.nonNegotiableTechniques.length) errors.push(`${label} must record non-negotiable techniques`);
  if (!recipe.research.repeatedSuccessSignals.length) errors.push(`${label} must record success signals`);
  if (!recipe.research.repeatedFailureRisks.length) errors.push(`${label} must record failure risks`);
  if (!recipe.research.adaptationDecision.trim()) errors.push(`${label} must record an adaptation decision`);

  return errors;
}

export function validateEditorialBatch(recipes: readonly EditorialRecipe[]): string[] {
  const errors = recipes.flatMap(validateEditorialRecipe);
  const ids = new Set<string>();
  const titles = new Set<string>();
  for (const recipe of recipes) {
    const titleKey = recipe.title.trim().toLocaleLowerCase();
    if (ids.has(recipe.rosterId)) errors.push(`${recipe.rosterId} is duplicated in the batch`);
    if (titles.has(titleKey)) errors.push(`${recipe.title} is duplicated in the batch`);
    ids.add(recipe.rosterId);
    titles.add(titleKey);
  }
  return errors;
}
