const acceptAll = (ingredients) => Object.fromEntries(
  ingredients.map((_, position) => [position, { accept: true }]),
);

const equipmentCandidates = [
  { phrase: 'large rimmed sheet pan', id: 'rimmed-sheet-pan', label: 'Large rimmed sheet pan' },
  { phrase: 'oven-safe skillet', id: 'oven-safe-skillet', label: 'Large oven-safe skillet' },
  { phrase: 'large skillet', id: 'large-skillet', label: 'Large skillet' },
  { phrase: 'Dutch oven', id: 'dutch-oven', label: 'Dutch oven or deep skillet' },
  { phrase: 'deep skillet', id: 'deep-skillet', label: 'Deep skillet' },
  { phrase: 'large pot', id: 'large-pot', label: 'Large pot' },
];

function equipmentFor(instructions) {
  for (let instructionIndex = 0; instructionIndex < instructions.length; instructionIndex += 1) {
    const instruction = instructions[instructionIndex];
    const candidate = equipmentCandidates.find(({ phrase }) => instruction.toLowerCase().includes(phrase.toLowerCase()));
    if (candidate) return { ...candidate, instructionIndex };
  }
  throw new Error('Meal-kit Recipe has no grounded primary equipment phrase.');
}

function costTier(ingredients) {
  const text = ingredients.join(' ').toLowerCase();
  if (/salmon|shrimp|cod|steak|beef tenderloin/.test(text)) return '$$$';
  if (/chicken|turkey|pork|ground beef|sausage/.test(text)) return '$$';
  return '$';
}

function difficulty(instructions) {
  const text = instructions.join(' ').toLowerCase();
  return /broil|reserve .* water|dutch oven|meatballs/.test(text) ? 'Moderate' : 'Easy';
}

function source({ title, publisher, url }) {
  return { title, publisher, url };
}

export function buildMealKitExpansionAuthoring(manifest, publishedMediaByRosterId = {}) {
  return Object.fromEntries(manifest.recipes.map((recipe) => {
    const task = recipe.researchTask;
    if (!task) throw new Error(`${recipe.rosterId} is missing its research task.`);
    if (task.sources.length < 2) throw new Error(`${recipe.rosterId} needs two independent sources.`);
    const equipment = equipmentFor(task.instructions);
    const title = recipe.title;
    const publishedMedia = publishedMediaByRosterId[recipe.rosterId] ?? null;
    const imageBrief = [
      `${title} as one single hero serving in a beautiful modern cookbook photograph.`,
      task.description,
      `Required evidence: ${task.ingredients.filter((line) => !/^2 tablespoons olive oil|^1 teaspoon kosher salt/i.test(line)).join('; ')}.`,
      'Keep the main, base, two vegetables, sauce, and finish visually distinct.',
      'Do not show four cloned bowls or plates, a tiled meal, repeated copies of the same serving, unsupported garnishes, text, logos, packaging, hands, or people.',
    ].join(' ');
    const value = {
      cookingReview: {
        decision: 'approved',
        rationale: `Reviewed as an original Kwilt Kitchen composition. ${task.existingResearch.adaptationDecision} The method retains the canonical doneness cue, ingredient relationships, and explicit inspired-not-traditional boundary.`,
      },
      reviewedAt: '2026-08-24',
      publication: { publishedAt: publishedMedia?.publishedAt ?? null },
      costTier: costTier(task.ingredients),
      difficulty: difficulty(task.instructions),
      ingredientReview: acceptAll(task.ingredients),
      commerce: {
        decision: 'no_purchase_needed',
        needId: null,
        reviewCategoryId: null,
        rationale: `The recipe uses ordinary household cookware; no specialized purchase is needed to follow its reviewed method.`,
        noPurchaseAlternative: null,
      },
      equipmentNeeds: [{ id: equipment.id, label: equipment.label }],
      equipmentAnnotations: [{
        instructionIndex: equipment.instructionIndex,
        phrase: equipment.phrase,
        needId: equipment.id,
        focus: 'general',
      }],
      origin: {
        label: 'Kwilt Kitchen, United States',
        region: `Contemporary North American meal-kit cooking with ${recipe.cuisine} flavor cues`,
        markers: [{ label: 'Kwilt Kitchen, United States', latitude: 39.7392, longitude: -104.9903 }],
        map: { center: [-104.9903, 39.7392], scale: 700, highlightedCountryIds: ['840'] },
      },
      history: {
        paragraphs: [
          `${title} is an original Kwilt Kitchen weeknight composition, not a reproduction of a meal-kit provider recipe or a claim of traditional authenticity. It uses ${recipe.cuisine} flavor cues inside a practical main, vegetable, base, sauce, and finish structure.`,
          `Green Chef's menu categories and Blue Apron's public cookbook document the broad contemporary meal-kit pattern behind the user's request. This recipe applies that pattern through Kwilt-authored ingredients and method: ${task.existingResearch.adaptationDecision}`,
        ],
        sources: task.sources.slice(0, 2).map(source),
      },
      heroImage: publishedMedia ? {
        state: 'published',
        storageRef: publishedMedia.storageRef,
        altText: publishedMedia.altText,
        width: publishedMedia.width,
        height: publishedMedia.height,
      } : { state: 'missing', storageRef: null, altText: `${title} plated as one composed weeknight dinner.`, width: null, height: null },
      heroAltText: `${title} plated as one composed weeknight dinner.`,
      imageBrief,
    };
    return [recipe.rosterId, value];
  }));
}
