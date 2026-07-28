export type PlaceKind = 'place' | 'park' | 'trail' | 'overlook' | 'summit' | 'landmark';

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  latitude: number;
  longitude: number;
  source: 'apple-maps' | 'user';
};

export type PlaceVisitEvidence = 'route-intersection' | 'user-confirmed';

/**
 * Person-specific metadata for one canonical Place. A Place is shared domain
 * identity; visiting, collecting, and visibility belong to the relationship.
 */
export type UserPlaceRelationship = {
  id: string;
  userId: string;
  placeId: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  visitCount: number;
  evidence: PlaceVisitEvidence;
  visibility: 'private' | 'family';
};
