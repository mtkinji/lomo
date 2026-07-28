import type { Place, UserPlaceRelationship } from '../../../domain/places';

export type { Place, UserPlaceRelationship } from '../../../domain/places';

export type ExploreCoordinate = {
  latitude: number;
  longitude: number;
};

export type ExplorePoint = ExploreCoordinate & {
  id: string;
  altitudeM: number | null;
  horizontalAccuracyM: number | null;
  altitudeAccuracyM: number | null;
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
};

export type ExploreSharingLevel = 'private' | 'territory' | 'completed-paths' | 'live';

export type ExplorePreferences = {
  recording: 'manual' | 'automatic';
  sharing: ExploreSharingLevel;
  showMyPath: boolean;
  showFamilyTerritory: boolean;
  visibleMemberIds: string[];
};

export type ExploreData = {
  version: 1;
  activeSession: ExploreSession | null;
  sessions: ExploreSession[];
  exploredCells: Record<string, ExploredCell>;
  places: Record<string, Place>;
  placeRelationships: Record<string, UserPlaceRelationship>;
  preferences: ExplorePreferences;
};
