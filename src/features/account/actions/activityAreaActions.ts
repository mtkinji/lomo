import { createActivityAreaId } from '../../../domain/activityAreas';
import type { Activity, ActivityArea } from '../../../domain/types';

export type ActivityAreaActionsBoundary = {
  read(): { areas: ActivityArea[]; activities: Activity[] };
  apply(areas: ActivityArea[]): void;
};

export class ActivityAreaConflictError extends Error {
  constructor() {
    super('The Activity area changed after this action was reviewed.');
    this.name = 'ActivityAreaConflictError';
  }
}

function opaqueFingerprint(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `area:${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function fingerprint(area: ActivityArea): string {
  return opaqueFingerprint(JSON.stringify({
    id: area.id, label: area.label, order: area.order, archivedAt: area.archivedAt ?? null,
    isDefault: area.isDefault === true,
    scheduling: {
      enabled: area.scheduling?.enabled !== false,
      fallbackMode: area.scheduling?.fallbackMode ?? null,
      windows: area.scheduling?.windows ?? [],
    },
  }));
}

function cleanLabel(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
    throw new Error('Activity area names must be between 1 and 80 characters.');
  }
  return value.trim();
}

function affectedCount(areaId: string, activities: Activity[]) {
  return activities.filter((activity) => activity.areaId === areaId).length;
}

function summary(area: ActivityArea, activities: Activity[]) {
  return {
    areaId: area.id,
    label: area.label,
    order: area.order,
    archived: Boolean(area.archivedAt),
    isDefault: area.isDefault === true,
    schedulingEnabled: area.scheduling?.enabled !== false,
    fallbackMode: area.scheduling?.fallbackMode ?? null,
    affectedActivityCount: affectedCount(area.id, activities),
    fingerprint: fingerprint(area),
  };
}

export function activityAreaReviewReference(area: ActivityArea) {
  return { areaId: area.id, expectedFingerprint: fingerprint(area) };
}

export function createActivityAreaActions(boundary: ActivityAreaActionsBoundary) {
  return {
    list() {
      const { areas, activities } = boundary.read();
      return { areas: [...areas].sort((left, right) => left.order - right.order).map((area) => summary(area, activities)) };
    },
    get(input: { areaId: string }) {
      const { areas, activities } = boundary.read();
      const area = areas.find((item) => item.id === input.areaId);
      if (!area) throw new Error('That Activity area is not available.');
      return summary(area, activities);
    },
    create(input: { label: string }) {
      const label = cleanLabel(input.label);
      const before = boundary.read();
      if (before.areas.some((area) => area.label.trim().toLowerCase() === label.toLowerCase() && !area.archivedAt)) {
        throw new Error('An active Activity area with that name already exists.');
      }
      const created: ActivityArea = {
        id: createActivityAreaId(label, before.areas), label, order: before.areas.length,
        scheduling: { enabled: true, fallbackMode: 'personal' },
      };
      boundary.apply([...before.areas, created]);
      const after = boundary.read();
      const confirmed = after.areas.find((area) => area.id === created.id);
      if (!confirmed) throw new Error('Kwilt did not confirm the Activity area creation.');
      return summary(confirmed, after.activities);
    },
    update(input: { areaId: string; expectedFingerprint: string; label: string }) {
      const label = cleanLabel(input.label);
      const before = boundary.read();
      const current = before.areas.find((area) => area.id === input.areaId);
      if (!current || current.archivedAt) throw new Error('That active Activity area is not available.');
      if (fingerprint(current) !== input.expectedFingerprint) throw new ActivityAreaConflictError();
      if (before.areas.some((area) => area.id !== current.id && !area.archivedAt
        && area.label.trim().toLowerCase() === label.toLowerCase())) {
        throw new Error('An active Activity area with that name already exists.');
      }
      boundary.apply(before.areas.map((area) => area.id === current.id ? { ...area, label } : area));
      const after = boundary.read();
      const confirmed = after.areas.find((area) => area.id === current.id);
      if (!confirmed || confirmed.label !== label) throw new Error('Kwilt did not confirm the Activity area update.');
      return summary(confirmed, after.activities);
    },
    delete(input: { areaId: string; expectedFingerprint: string }) {
      const before = boundary.read();
      const current = before.areas.find((area) => area.id === input.areaId);
      if (!current || current.archivedAt) throw new Error('That active Activity area is not available.');
      if (fingerprint(current) !== input.expectedFingerprint) throw new ActivityAreaConflictError();
      const archivedAt = new Date().toISOString();
      boundary.apply(before.areas.map((area) => area.id === current.id ? { ...area, archivedAt } : area));
      const after = boundary.read();
      const confirmed = after.areas.find((area) => area.id === current.id);
      if (!confirmed?.archivedAt) throw new Error('Kwilt did not confirm the Activity area archive.');
      return summary(confirmed, after.activities);
    },
  };
}
