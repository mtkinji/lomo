import { rebuildExploreTerritory } from './exploreState';
import type { ExploreData, ExploreSession, Place, UserPlaceRelationship } from './types';

export type ExploreRecordType = 'session' | 'place' | 'relationship' | 'reset';

export type ExploreRecordWrite = {
  user_id: string;
  record_type: ExploreRecordType;
  record_id: string;
  payload: Record<string, unknown>;
  client_updated_at: string;
  deleted_at: string | null;
};

export type ExploreRemoteRecord = ExploreRecordWrite & {
  created_at: string;
  updated_at: string;
};

function latestIso(...values: Array<string | null | undefined>): string | null {
  return values.filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function sessionUpdatedAt(session: ExploreSession): string {
  const latest = latestIso(
    session.endedAt,
    session.recapNotificationSentAt,
    session.points.at(-1)?.recordedAt,
    session.startedAt,
  ) ?? session.startedAt;
  const recapRevision = {
    none: 0,
    resolving: 1,
    ready: 2,
    seen: 3,
  }[session.recapStatus];
  const timestamp = Date.parse(latest);
  return Number.isFinite(timestamp)
    ? new Date(timestamp + recapRevision).toISOString()
    : latest;
}

function relationshipUpdatedAt(
  placeId: string,
  relationships: Record<string, UserPlaceRelationship>,
): string | null {
  return latestIso(...Object.values(relationships)
    .filter((relationship) => relationship.placeId === placeId)
    .map((relationship) => relationship.lastVisitedAt));
}

export function encodeExploreRecords(data: ExploreData, userId: string): ExploreRecordWrite[] {
  const sessions = [...data.sessions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((session): ExploreRecordWrite => ({
      user_id: userId,
      record_type: 'session',
      record_id: session.id,
      payload: session as unknown as Record<string, unknown>,
      client_updated_at: sessionUpdatedAt(session),
      deleted_at: null,
    }));
  const places = Object.values(data.places)
    .filter((place) => !data.sync.deletedPlaceIds[place.id])
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((place): ExploreRecordWrite => ({
      user_id: userId,
      record_type: 'place',
      record_id: place.id,
      payload: place as unknown as Record<string, unknown>,
      client_updated_at: relationshipUpdatedAt(place.id, data.placeRelationships) ?? new Date(0).toISOString(),
      deleted_at: null,
    }));
  const relationships = Object.values(data.placeRelationships)
    .filter((relationship) => !data.sync.deletedPlaceIds[relationship.placeId])
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((relationship): ExploreRecordWrite => ({
      user_id: userId,
      record_type: 'relationship',
      record_id: relationship.id,
      payload: relationship as unknown as Record<string, unknown>,
      client_updated_at: relationship.lastVisitedAt,
      deleted_at: null,
    }));
  const deletedPlaces = Object.entries(data.sync.deletedPlaceIds)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([placeId, deletedAt]): ExploreRecordWrite => ({
      user_id: userId,
      record_type: 'place',
      record_id: placeId,
      payload: {},
      client_updated_at: deletedAt,
      deleted_at: deletedAt,
    }));
  const resetUpdatedAt = latestIso(
    data.sync.historyResetAt,
    ...Object.values(data.sync.deletedPlaceIds),
  );
  const reset = resetUpdatedAt ? [{
    user_id: userId,
    record_type: 'reset' as const,
    record_id: 'history',
    payload: {
      historyResetAt: data.sync.historyResetAt,
      deletedPlaceIds: data.sync.deletedPlaceIds,
    },
    client_updated_at: resetUpdatedAt,
    deleted_at: null,
  }] : [];
  return [...sessions, ...places, ...relationships, ...deletedPlaces, ...reset];
}

export function recordsChangedAfter(
  records: ExploreRecordWrite[],
  lastSyncedAt: string | null,
): ExploreRecordWrite[] {
  if (!lastSyncedAt) return records;
  const cutoff = Date.parse(lastSyncedAt);
  return records.filter((record) => Date.parse(record.client_updated_at) > cutoff);
}

function isSession(value: unknown): value is ExploreSession {
  const session = value as Partial<ExploreSession> | null;
  return Boolean(session && typeof session.id === 'string' && typeof session.startedAt === 'string' &&
    Array.isArray(session.points) && Array.isArray(session.discoveredPlaceIds));
}

function isPlace(value: unknown): value is Place {
  const place = value as Partial<Place> | null;
  return Boolean(place && typeof place.id === 'string' && typeof place.name === 'string' &&
    typeof place.latitude === 'number' && typeof place.longitude === 'number' &&
    (place.source === 'user' || place.source === 'apple-maps'));
}

function isRelationship(value: unknown): value is UserPlaceRelationship {
  const relationship = value as Partial<UserPlaceRelationship> | null;
  return Boolean(relationship && typeof relationship.id === 'string' &&
    typeof relationship.userId === 'string' && typeof relationship.placeId === 'string' &&
    typeof relationship.lastVisitedAt === 'string');
}

function resetMetadata(record: ExploreRemoteRecord): ExploreData['sync'] | null {
  if (record.record_type !== 'reset' || record.record_id !== 'history') return null;
  const payload = record.payload as {
    historyResetAt?: unknown;
    deletedPlaceIds?: unknown;
  };
  const deletedPlaceIds = payload.deletedPlaceIds && typeof payload.deletedPlaceIds === 'object'
    ? Object.fromEntries(Object.entries(payload.deletedPlaceIds)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {};
  return {
    historyResetAt: typeof payload.historyResetAt === 'string' ? payload.historyResetAt : null,
    deletedPlaceIds,
    lastSyncedAt: null,
  };
}

export function mergeExploreRecords(local: ExploreData, remote: ExploreRemoteRecord[]): ExploreData {
  let historyResetAt = local.sync.historyResetAt;
  const deletedPlaceIds = { ...local.sync.deletedPlaceIds };
  remote.forEach((record) => {
    const reset = resetMetadata(record);
    if (!reset) return;
    historyResetAt = latestIso(historyResetAt, reset.historyResetAt);
    Object.entries(reset.deletedPlaceIds).forEach(([placeId, deletedAt]) => {
      const current = deletedPlaceIds[placeId];
      if (!current || Date.parse(deletedAt) > Date.parse(current)) deletedPlaceIds[placeId] = deletedAt;
    });
  });

  const sessionMap = new Map(local.sessions.map((session) => [session.id, session]));
  remote.filter((record) => record.record_type === 'session' && !record.deleted_at && isSession(record.payload))
    .forEach((record) => {
      const incoming = record.payload as unknown as ExploreSession;
      const current = sessionMap.get(incoming.id);
      if (!current || Date.parse(record.client_updated_at) >= Date.parse(sessionUpdatedAt(current))) {
        sessionMap.set(incoming.id, incoming);
      }
    });

  const placeMap = new Map(Object.values(local.places).map((place) => [place.id, place]));
  remote.filter((record) => record.record_type === 'place').forEach((record) => {
    if (record.deleted_at) {
      const current = deletedPlaceIds[record.record_id];
      if (!current || Date.parse(record.deleted_at) > Date.parse(current)) {
        deletedPlaceIds[record.record_id] = record.deleted_at;
      }
      return;
    }
    if (isPlace(record.payload)) placeMap.set(record.record_id, record.payload);
  });

  const relationshipMap = new Map(Object.values(local.placeRelationships)
    .map((relationship) => [relationship.id, relationship]));
  remote.filter((record) => record.record_type === 'relationship' && !record.deleted_at && isRelationship(record.payload))
    .forEach((record) => {
      const incoming = record.payload as unknown as UserPlaceRelationship;
      const current = relationshipMap.get(incoming.id);
      if (!current || Date.parse(incoming.lastVisitedAt) >= Date.parse(current.lastVisitedAt)) {
        relationshipMap.set(incoming.id, incoming);
      }
    });

  const resetTime = historyResetAt ? Date.parse(historyResetAt) : Number.NEGATIVE_INFINITY;
  const sessions = [...sessionMap.values()]
    .filter((session) => Date.parse(sessionUpdatedAt(session)) > resetTime)
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));
  const placeRelationships = Object.fromEntries([...relationshipMap.values()]
    .filter((relationship) => Date.parse(relationship.lastVisitedAt) > resetTime)
    .filter((relationship) => {
      const deletedAt = deletedPlaceIds[relationship.placeId];
      return !deletedAt || Date.parse(relationship.lastVisitedAt) > Date.parse(deletedAt);
    })
    .map((relationship) => [relationship.id, relationship]));
  const usedPlaceIds = new Set(Object.values(placeRelationships).map((relationship) => relationship.placeId));
  const places = Object.fromEntries([...placeMap.values()]
    .filter((place) => usedPlaceIds.has(place.id))
    .filter((place) => !deletedPlaceIds[place.id])
    .map((place) => [place.id, place]));

  return rebuildExploreTerritory({
    ...local,
    sessions,
    places,
    placeRelationships,
    sync: { ...local.sync, historyResetAt, deletedPlaceIds },
  });
}
