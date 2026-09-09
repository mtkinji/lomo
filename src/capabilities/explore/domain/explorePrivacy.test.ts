import { canRenderExploreLayer, createDefaultExplorePreferences } from './explorePrivacy';

describe('Explore privacy projections', () => {
  it('defaults to private ambient exploration with recorded paths visible', () => {
    expect(createDefaultExplorePreferences()).toEqual({
      recording: 'automatic',
      sharing: 'private',
      showMyPath: true,
      showFamilyTerritory: false,
      showFog: true,
      showPlaces: true,
      mapStyle: 'hybrid',
      visibleMemberIds: [],
      recapNotifications: true,
      showPlaceNamesOnLockScreen: false,
      onboardingCompleted: false,
      firstPlaceGuideDismissed: false,
    });
  });

  it('requires both contributor permission and viewer selection', () => {
    expect(
      canRenderExploreLayer({ contributorSharing: 'territory', requestedLayer: 'territory', viewerEnabled: true }),
    ).toBe(true);
    expect(
      canRenderExploreLayer({ contributorSharing: 'private', requestedLayer: 'territory', viewerEnabled: true }),
    ).toBe(false);
    expect(
      canRenderExploreLayer({ contributorSharing: 'live', requestedLayer: 'live', viewerEnabled: false }),
    ).toBe(false);
  });
});
