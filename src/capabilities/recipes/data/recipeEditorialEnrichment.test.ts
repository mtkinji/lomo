import { parseRecipeEditorialEnrichment } from './recipeEditorialEnrichment';

const instructions = [
  'Whisk the eggs in a medium mixing bowl.',
  'Cook in a rectangular tamagoyaki pan or an 8-inch skillet.',
];

function validRecord() {
  return {
    schemaVersion: 1,
    rosterId: 'BR031',
    sourceRecipeHash: `sha256:${'a'.repeat(64)}`,
    review: {
      state: 'reviewed',
      reviewedAt: '2026-08-20',
      reviewedBy: 'Kwilt Kitchen',
    },
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
    expect(parseRecipeEditorialEnrichment(validRecord(), instructions)).toEqual(validRecord());
  });

  it.each([
    ['duplicate equipment ids', (record: ReturnType<typeof validRecord>) => record.equipmentNeeds.push(record.equipmentNeeds[0])],
    ['missing equipment evidence', (record: ReturnType<typeof validRecord>) => { record.equipmentAnnotations[0].phrase = 'nonexistent pan'; }],
    ['unknown equipment need', (record: ReturnType<typeof validRecord>) => { record.equipmentAnnotations[0].needId = 'missing'; }],
    ['invalid latitude', (record: ReturnType<typeof validRecord>) => { record.origin.markers[0].latitude = 91; }],
    ['uncited history', (record: ReturnType<typeof validRecord>) => { record.history.sources = []; }],
    ['non-https source', (record: ReturnType<typeof validRecord>) => { record.history.sources[0].url = 'http://example.test'; }],
    ['published image without https media', (record: ReturnType<typeof validRecord>) => { record.heroImage.storageRef = 'bundle://atlas/1'; }],
  ])('rejects %s', (_label, mutate) => {
    const record = validRecord();
    mutate(record);
    expect(() => parseRecipeEditorialEnrichment(record, instructions)).toThrow();
  });

  it('rejects unknown fields so generated drafts cannot silently widen the contract', () => {
    expect(() => parseRecipeEditorialEnrichment({ ...validRecord(), historicalFactFromModel: true }, instructions)).toThrow();
  });
});
