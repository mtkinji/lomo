import { canRenderExploreLayer, createDefaultExplorePreferences } from './explorePrivacy';

describe('Explore privacy projections', () => {
  it('defaults to private recording with only the personal path visible', () => {
    expect(createDefaultExplorePreferences()).toEqual({
      recording: 'manual',
      sharing: 'private',
      showMyPath: true,
      showFamilyTerritory: false,
      visibleMemberIds: [],
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
