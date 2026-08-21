function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function compileReviewedBatch({ batch, catalog, structuredDrafts, authoring, existingRecords }) {
  const recipeById = new Map(catalog.map((recipe) => [recipe.rosterId, recipe]));
  const draftById = new Map(structuredDrafts.map((draft) => [draft.rosterId, draft]));
  const existingById = new Map(existingRecords.map((record) => [record.rosterId, record]));
  const recipes = batch.recipes.map((manifestRecipe) => {
    const recipe = recipeById.get(manifestRecipe.rosterId);
    const draft = draftById.get(manifestRecipe.rosterId);
    const authored = authoring[manifestRecipe.rosterId];
    if (!recipe || !draft || !authored) throw new Error(`${manifestRecipe.rosterId} is missing catalog, ingredient draft, or authoring data.`);
    if (authored.cookingReview?.decision !== 'approved' || !authored.cookingReview.rationale?.trim()) {
      throw new Error(`${manifestRecipe.rosterId} needs an explicit cooking-truth approval and rationale.`);
    }
    for (const finding of draft.reviewFindings) {
      if (!Object.prototype.hasOwnProperty.call(authored.ingredientReview, finding.position)) {
        throw new Error(`${manifestRecipe.rosterId} ingredient ${finding.position} has an unresolved ingredient review.`);
      }
    }
    const structuredIngredients = draft.lines.map((line) => {
      const resolution = authored.ingredientReview[line.position];
      if (resolution?.patch) return { ...line, ...resolution.patch };
      return line;
    });
    if (authored.history.sources.length < 2) throw new Error(`${manifestRecipe.rosterId} needs at least two history sources.`);
    const existing = existingById.get(manifestRecipe.rosterId);
    const heroImage = authored.heroImage ?? existing?.heroImage ?? {
      state: 'missing', storageRef: null, altText: authored.heroAltText ?? null, width: null, height: null,
    };
    const publication = {
      slug: `${slugify(recipe.title)}-${recipe.rosterId.toLowerCase()}`,
      publishedAt: null,
      ...authored.publication,
    };
    const sitePublication = heroImage.state === 'published' && publication.publishedAt ? 'published' : 'pending';
    return {
      schemaVersion: 2,
      rosterId: manifestRecipe.rosterId,
      sourceRecipeHash: manifestRecipe.sourceRecipeHash,
      review: {
        state: sitePublication === 'published' ? 'reviewed' : 'in_progress',
        reviewedAt: authored.reviewedAt,
        reviewedBy: 'Kwilt Kitchen · Codex',
        sections: {
          cookingTruth: 'reviewed',
          structuredIngredients: 'reviewed',
          originHistory: 'reviewed',
          equipment: 'reviewed',
          commerce: 'reviewed',
          sitePublication,
        },
      },
      costTier: authored.costTier,
      difficulty: authored.difficulty,
      structuredIngredients,
      instructionQuantityPhrases: authored.instructionQuantityPhrases ?? {},
      commerce: authored.commerce,
      publication,
      equipmentNeeds: authored.equipmentNeeds,
      equipmentAnnotations: authored.equipmentAnnotations,
      origin: authored.origin,
      history: authored.history,
      heroImage,
    };
  });
  return { schemaVersion: 2, source: 'kwilt-codex-reviewed-recipe-enrichment', batchId: batch.batchId, manifestHash: batch.manifestHash, recipes };
}
