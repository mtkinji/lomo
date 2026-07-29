import type { ExplorePreferences, ExploreSharingLevel } from './types';

export function createDefaultExplorePreferences(): ExplorePreferences {
  return {
    recording: 'manual',
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
  };
}

const SHARING_RANK: Record<ExploreSharingLevel, number> = {
  private: 0,
  territory: 1,
  'completed-paths': 2,
  live: 3,
};

export function canRenderExploreLayer(params: {
  contributorSharing: ExploreSharingLevel;
  requestedLayer: Exclude<ExploreSharingLevel, 'private'>;
  viewerEnabled: boolean;
}): boolean {
  return params.viewerEnabled && SHARING_RANK[params.contributorSharing] >= SHARING_RANK[params.requestedLayer];
}
