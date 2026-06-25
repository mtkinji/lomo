import type { Activity, Arc, Goal } from '../domain/types';
import { normalizeActivity } from '../domain/normalizeActivity';

type HeroImageDomainObject = {
  thumbnailUrl?: unknown;
  heroImageMeta?: unknown;
};

export type DomainSnapshotInput = {
  arcs?: unknown;
  goals?: unknown;
  activities?: unknown;
  activityTagHistory?: unknown;
};

export type NormalizedDomainSnapshot = {
  arcs?: Arc[];
  goals?: Goal[];
  activities?: Activity[];
  activityTagHistory?: unknown;
};

function normalizeHttpUrl(url: string): string {
  return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

function normalizeHeroImageUrl<T extends HeroImageDomainObject>(obj: T): T {
  const rawUrl = typeof obj?.thumbnailUrl === 'string' ? obj.thumbnailUrl.trim() : '';
  const normalizedUrl = normalizeHttpUrl(rawUrl);
  if (rawUrl && rawUrl !== normalizedUrl) {
    return { ...obj, thumbnailUrl: normalizedUrl };
  }
  return obj;
}

export function normalizeDomainSnapshot(
  raw: DomainSnapshotInput,
  nowIso = new Date().toISOString(),
): NormalizedDomainSnapshot {
  const next: NormalizedDomainSnapshot = {};

  if (Array.isArray(raw.arcs)) {
    next.arcs = raw.arcs.map((item) => normalizeHeroImageUrl(item as Arc));
  }
  if (Array.isArray(raw.goals)) {
    next.goals = raw.goals.map((item) => normalizeHeroImageUrl(item as Goal));
  }
  if (Array.isArray(raw.activities)) {
    next.activities = raw.activities
      .map((item) => normalizeHeroImageUrl(item as Activity))
      .map((activity) => normalizeActivity({ activity, nowIso }));
  }
  if (raw.activityTagHistory && typeof raw.activityTagHistory === 'object') {
    next.activityTagHistory = raw.activityTagHistory;
  }

  return next;
}
