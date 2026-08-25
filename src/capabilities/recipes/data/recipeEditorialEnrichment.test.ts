import { parseRecipeEditorialEnrichment } from './recipeEditorialEnrichment';

const instructions = [
  'Whisk 2 eggs in a medium mixing bowl.',
  'Cook in a rectangular tamagoyaki pan or an 8-inch skillet.',
];

function validRecord() {
  return {
    schemaVersion: 2,
    rosterId: 'BR031',
    sourceRecipeHash: `sha256:${'a'.repeat(64)}`,
    review: {
      state: 'in_progress',
      reviewedAt: '2026-08-20',
      reviewedBy: 'Kwilt Kitchen',
      sections: {
        cookingTruth: 'reviewed',
        structuredIngredients: 'reviewed',
        originHistory: 'reviewed',
        equipment: 'reviewed',
        commerce: 'pending',
        sitePublication: 'pending',
      },
    },
    costTier: '$$',
    difficulty: 'Moderate',
    scalingState: 'verified',
    structuredIngredients: [
      {
        position: 0,
        originalText: '2 large eggs',
        quantityMin: 2,
        quantityMax: 2,
        unit: 'large',
        ingredientConcept: 'egg',
        preparation: null,
        optional: false,
        parseConfidence: 0.99,
        scaleRule: { kind: 'multiply' as const },
      },
    ],
    instructionQuantityPhrases: { 0: ['2 eggs'] },
    commerce: {
      decision: 'pending',
      needId: null,
      reviewCategoryId: null,
      rationale: null,
      noPurchaseAlternative: null,
    },
    publication: { slug: 'test-breakfast-br031', publishedAt: null },
    equipmentNeeds: [
      { id: 'mixing-bowl', label: 'Medium mixing bowl' },
      { id: 'tamagoyaki-pan', label: 'Rectangular tamagoyaki pan', reviewCategoryId: 'tamagoyaki-pan' },
    ],
    equipmentAnnotations: [
      {
        instructionIndex: 1,
        phrase: 'rectangular tamagoyaki pan',
        needId: 'tamagoyaki-pan',
        focus: 'specialty',
        accessibleLabel: 'See tamagoyaki pan guidance',
      },
    ],
    origin: {
      label: 'Japan',
      region: 'East Asia',
      markers: [{ label: 'Japan', latitude: 36.2, longitude: 138.25 }],
      map: { center: [138, 36], scale: 940, highlightedCountryIds: ['392'] },
    },
    history: {
      paragraphs: [
        'Rolled omelets became an everyday part of Japanese home cooking and packed meals.',
        'Regional seasoning differs, with sweeter Kanto versions and softer dashi-forward Kansai versions.',
      ],
      sources: [
        { title: 'Tamagoyaki', publisher: 'Web Japan', url: 'https://web-japan.org/kidsweb/cook/tamagoyaki/index.html' },
        { title: 'Japanese food culture', publisher: 'MAFF', url: 'https://www.maff.go.jp/e/' },
      ],
    },
    heroImage: {
      state: 'published',
      storageRef: 'https://example.test/recipe.webp',
      altText: 'Sliced tamagoyaki served with rice and soup.',
      width: 1536,
      height: 1024,
    },
  };
}

describe('Recipe editorial enrichment contract', () => {
  it('accepts source-attributed equipment, origin, history, and published imagery', () => {
    expect(parseRecipeEditorialEnrichment(validRecord(), instructions, ['2 large eggs'])).toEqual(validRecord());
  });

  it('normalizes legacy records as incomplete without inventing review proof', () => {
    const legacy = validRecord();
    legacy.schemaVersion = 1 as 2;
    delete (legacy as any).costTier;
    delete (legacy as any).difficulty;
    delete (legacy as any).scalingState;
    legacy.structuredIngredients.forEach((line) => delete (line as any).scaleRule);
    delete (legacy as any).structuredIngredients;
    delete (legacy as any).instructionQuantityPhrases;
    delete (legacy as any).commerce;
    delete (legacy as any).publication;
    delete (legacy.review as any).sections;
    legacy.review.state = 'reviewed' as 'in_progress';

    expect(parseRecipeEditorialEnrichment(legacy, instructions, ['2 large eggs'])).toMatchObject({
      schemaVersion: 2,
      costTier: null,
      difficulty: null,
      scalingState: 'review_required',
      structuredIngredients: [],
      instructionQuantityPhrases: {},
      review: {
        state: 'in_progress',
        sections: {
          structuredIngredients: 'pending',
          commerce: 'pending',
          sitePublication: 'pending',
        },
      },
    });
  });

  it.each([
    ['duplicate equipment ids', (record: ReturnType<typeof validRecord>) => record.equipmentNeeds.push(record.equipmentNeeds[0])],
    ['missing equipment evidence', (record: ReturnType<typeof validRecord>) => { record.equipmentAnnotations[0].phrase = 'nonexistent pan'; }],
    ['unknown equipment need', (record: ReturnType<typeof validRecord>) => { record.equipmentAnnotations[0].needId = 'missing'; }],
    ['invalid latitude', (record: ReturnType<typeof validRecord>) => { record.origin.markers[0].latitude = 91; }],
    ['uncited history', (record: ReturnType<typeof validRecord>) => { record.history.sources = []; }],
    ['non-https source', (record: ReturnType<typeof validRecord>) => { record.history.sources[0].url = 'http://example.test'; }],
    ['published image without https media', (record: ReturnType<typeof validRecord>) => { record.heroImage.storageRef = 'bundle://atlas/1'; }],
    ['ingredient position gap', (record: ReturnType<typeof validRecord>) => { record.structuredIngredients[0].position = 1; }],
    ['ingredient text mismatch', (record: ReturnType<typeof validRecord>) => { record.structuredIngredients[0].originalText = '3 eggs'; }],
    ['invalid cost tier', (record: ReturnType<typeof validRecord>) => { record.costTier = '$$$$' as '$$'; }],
  ])('rejects %s', (_label, mutate) => {
    const record = validRecord();
    mutate(record);
    expect(() => parseRecipeEditorialEnrichment(record, instructions, ['2 large eggs'])).toThrow();
  });

  it('rejects unknown fields so generated drafts cannot silently widen the contract', () => {
    expect(() => parseRecipeEditorialEnrichment({ ...validRecord(), historicalFactFromModel: true }, instructions, ['2 large eggs'])).toThrow();
  });
});
