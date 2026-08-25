import { render } from '@testing-library/react-native';

import type { RecipeEditorialEnrichment } from '../data/recipeEditorialEnrichment';
import { RecipeOriginStory, recipeOriginMapRegion } from './RecipeOriginStory';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View: NativeView } = require('react-native');
  const Map = ({ children, ...props }: { children?: React.ReactNode }) => React.createElement(NativeView, props, children);
  const Marker = (props: object) => React.createElement(NativeView, props);
  return { __esModule: true, default: Map, Marker };
});

const enrichment: RecipeEditorialEnrichment = {
  schemaVersion: 2,
  rosterId: 'BR031',
  sourceRecipeHash: `sha256:${'a'.repeat(64)}`,
  review: {
    state: 'reviewed',
    reviewedAt: '2026-08-20',
    reviewedBy: 'Kwilt editorial',
    sections: {
      cookingTruth: 'reviewed',
      structuredIngredients: 'reviewed',
      originHistory: 'reviewed',
      equipment: 'reviewed',
      commerce: 'reviewed',
      sitePublication: 'published',
    },
  },
  costTier: '$$',
  difficulty: 'Moderate',
  scalingState: 'review_required',
  structuredIngredients: [],
  instructionQuantityPhrases: {},
  commerce: {
    decision: 'no_purchase_needed',
    needId: null,
    reviewCategoryId: null,
    rationale: 'No purchase is needed for this origin-story fixture.',
    noPurchaseAlternative: null,
  },
  publication: { slug: 'test-recipe-br031', publishedAt: '2026-08-20T00:00:00.000Z' },
  equipmentNeeds: [],
  equipmentAnnotations: [],
  origin: {
    label: 'Japan',
    region: 'East Asia',
    markers: [{ label: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 }],
    map: { center: [138, 36], scale: 940, highlightedCountryIds: ['392'] },
  },
  history: {
    paragraphs: ['This dish grew through Japanese home cooking.', 'Its familiar form reflects a specific era and technique.'],
    sources: [
      {
        title: 'A culinary history',
        publisher: 'Japan Ministry of Agriculture',
        url: 'https://example.test/history',
      },
      {
        title: 'Regional foodways',
        publisher: 'National Diet Library',
        url: 'https://example.test/foodways',
      },
    ],
  },
  heroImage: { state: 'missing', storageRef: null, altText: null, width: null, height: null },
};

describe('Recipe origin story', () => {
  it('converts Kwilt editorial scale into a bounded native map region', () => {
    expect(recipeOriginMapRegion(enrichment.origin)).toEqual({
      latitude: 36,
      longitude: 138,
      latitudeDelta: expect.any(Number),
      longitudeDelta: expect.any(Number),
    });
    expect(recipeOriginMapRegion(enrichment.origin).latitudeDelta).toBeGreaterThanOrEqual(8);
    expect(recipeOriginMapRegion(enrichment.origin).latitudeDelta).toBeLessThanOrEqual(24);
  });

  it("renders an actual non-interactive map and history without exposing editorial research references", () => {
    const screen = render(<RecipeOriginStory enrichment={enrichment} />);

    expect(screen.getByText('Where this meal comes from')).toBeTruthy();
    expect(screen.getByText('Japan')).toBeTruthy();
    expect(screen.getByText('East Asia')).toBeTruthy();
    expect(screen.getByText(enrichment.history.paragraphs[0])).toBeTruthy();
    expect(screen.getByLabelText('Map showing Japan')).toBeTruthy();
    expect(screen.getByTestId('recipe-origin-map').props).toEqual(expect.objectContaining({
      mapType: 'standard',
      scrollEnabled: false,
      zoomEnabled: false,
      rotateEnabled: false,
      pitchEnabled: false,
    }));
    expect(screen.queryByText('A culinary history')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText(/researched and reviewed by kwilt/i)).toBeNull();
    expect(screen.queryByLabelText("How Kwilt reviews its recipes")).toBeNull();
  });

  it('shows one location label when the origin label and region match', () => {
    const repeatedLocation = {
      ...enrichment,
      origin: {
        ...enrichment.origin,
        label: 'Southwestern United States',
        region: 'Southwestern United States',
      },
    };

    const screen = render(<RecipeOriginStory enrichment={repeatedLocation} />);

    expect(screen.getAllByText('Southwestern United States')).toHaveLength(1);
  });
});
