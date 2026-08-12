const TIER_WEIGHT = {
  'household-anchor': 300,
  'cuisine-anchor': 200,
  discovery: 100,
};

function finiteNumbers(values) {
  return values.filter((value) => Number.isFinite(value));
}

export function recipePopularityScore(recipe) {
  const sources = recipe.research?.sources ?? [];
  const ratingCounts = finiteNumbers(sources.map((source) => source.ratingCount));
  const ratings = finiteNumbers(sources.map((source) => source.rating));
  const strongestReviewSignal = Math.max(0, ...ratingCounts);
  const averageRating = ratings.length
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : 0;
  const activeMinutes = Math.max(0, Number(recipe.prepMinutes ?? 0) + Number(recipe.cookMinutes ?? 0));
  const practicality = Math.max(0, 30 - Math.min(30, activeMinutes / 3));

  return (TIER_WEIGHT[recipe.tier] ?? 0)
    + Math.log10(strongestReviewSignal + 1) * 25
    + averageRating * 3
    + practicality;
}

export function rankRecipesByLikelyPopularity(recipes) {
  return [...recipes].sort((left, right) => {
    const scoreDelta = recipePopularityScore(right) - recipePopularityScore(left);
    if (Math.abs(scoreDelta) > Number.EPSILON) return scoreDelta;
    return String(left.rosterId).localeCompare(String(right.rosterId));
  });
}

export function buildWeeklyRecipeBatches(recipes, excludedRosterIds, batchSize = 100) {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error('batchSize must be a positive integer');
  const excluded = new Set(excludedRosterIds);
  const remaining = rankRecipesByLikelyPopularity(recipes.filter((recipe) => !excluded.has(recipe.rosterId)));
  const batches = [];
  for (let index = 0; index < remaining.length; index += batchSize) {
    batches.push(remaining.slice(index, index + batchSize));
  }
  return batches;
}
