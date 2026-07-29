import type { Place, UserPlaceRelationship } from '../../../domain/places';

export type { Place, UserPlaceRelationship } from '../../../domain/places';

export type ExploreCoordinate = {
  latitude: number;
  longitude: number;
};

export type ExploreTrackingPolicy = 'ambient' | 'adventure' | 'presence';
export type ExploreTrackingPhase = 'active' | 'soft-sleep' | 'deep-sleep';
export type ExploreMovementClass =
  | 'unknown'
  | 'stationary'
  | 'pedestrian'
  | 'cycling'
  | 'vehicle'
  | 'airplane';

export type ExploreTrackingState = {
  policy: ExploreTrackingPolicy | null;
  phase: ExploreTrackingPhase;
  movement: ExploreMovementClass;
  stationarySince: string | null;
  phaseChangedAt: string | null;
  wakeAnchor: (ExploreCoordinate & { horizontalAccuracyM: number | null }) | null;
};

export type ExplorePoint = ExploreCoordinate & {
  id: string;
  altitudeM: number | null;
  horizontalAccuracyM: number | null;
  altitudeAccuracyM: number | null;
  speedMps: number | null;
  courseDeg: number | null;
  recordedAt: string;
};

export type ExploredCell = {
  id: string;
  center: ExploreCoordinate;
  firstExploredAt: string;
  lastExploredAt: string;
};

export type ExploreSession = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  points: ExplorePoint[];
  discoveredPlaceIds: string[];
  recapStatus: 'none' | 'resolving' | 'ready' | 'seen';
  completedReason: 'manual' | 'background-stillness' | 'interrupted' | null;
  recapNotificationSentAt: string | null;
  backgroundStillnessAnchor: ExploreCoordinate | null;
  backgroundStillSince: string | null;
};

export type ExploreSharingLevel = 'private' | 'territory' | 'completed-paths' | 'live';
export type ExploreMapStyle = 'standard' | 'satellite' | 'hybrid';

export type ExplorePreferences = {
  recording: 'manual' | 'automatic';
  sharing: ExploreSharingLevel;
  showMyPath: boolean;
  showFamilyTerritory: boolean;
  showFog: boolean;
  showPlaces: boolean;
  mapStyle: ExploreMapStyle;
  visibleMemberIds: string[];
  recapNotifications: boolean;
  showPlaceNamesOnLockScreen: boolean;
  onboardingCompleted: boolean;
  firstPlaceGuideDismissed: boolean;
};

export type ExploreData = {
  version: 8;
  activeSession: ExploreSession | null;
  sessions: ExploreSession[];
  exploredCells: Record<string, ExploredCell>;
  places: Record<string, Place>;
  placeRelationships: Record<string, UserPlaceRelationship>;
  preferences: ExplorePreferences;
  tracking: ExploreTrackingState;
};
