import type { ActivityArea, ActivityAreaFallbackMode } from './types';

export const DEFAULT_ACTIVITY_AREAS: ActivityArea[] = [
  {
    id: 'area-work',
    label: 'Work',
    order: 0,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'work' },
  },
  {
    id: 'area-personal',
    label: 'Personal',
    order: 1,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
  {
    id: 'area-family',
    label: 'Family',
    order: 2,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
  {
    id: 'area-home',
    label: 'Home',
    order: 3,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
  {
    id: 'area-health',
    label: 'Health',
    order: 4,
    isDefault: true,
    scheduling: { enabled: true, fallbackMode: 'personal' },
  },
];

function normalizeFallbackMode(value: unknown): ActivityAreaFallbackMode | undefined {
  return value === 'work' || value === 'personal' || value === 'flexible' ? value : undefined;
}

function normalizeArea(value: unknown, fallbackOrder: number): ActivityArea | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ActivityArea>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (!id || !label) return null;
  const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : fallbackOrder;
  const archivedAt =
    typeof raw.archivedAt === 'string' && raw.archivedAt.trim().length > 0 ? raw.archivedAt.trim() : null;
  const fallbackMode = normalizeFallbackMode(raw.scheduling?.fallbackMode);

  return {
    id,
    label,
    order,
    archivedAt,
    isDefault: raw.isDefault === true,
    scheduling: {
      enabled: raw.scheduling?.enabled !== false,
      fallbackMode,
      windows: Array.isArray(raw.scheduling?.windows) ? raw.scheduling?.windows : undefined,
    },
  };
}

export function normalizeActivityAreas(value: unknown): ActivityArea[] {
  const input = Array.isArray(value) ? value : [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const normalized: ActivityArea[] = [];

  input.forEach((candidate, index) => {
    const area = normalizeArea(candidate, index);
    if (!area) return;
    const labelKey = area.label.toLowerCase();
    if (seenIds.has(area.id) || seenLabels.has(labelKey)) return;
    seenIds.add(area.id);
    seenLabels.add(labelKey);
    normalized.push(area);
  });

  DEFAULT_ACTIVITY_AREAS.forEach((defaultArea) => {
    const labelKey = defaultArea.label.toLowerCase();
    if (seenIds.has(defaultArea.id) || seenLabels.has(labelKey)) return;
    normalized.push(defaultArea);
  });

  return normalized.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function getActiveActivityAreas(areas: ActivityArea[]): ActivityArea[] {
  return normalizeActivityAreas(areas).filter((area) => !area.archivedAt);
}

export function findActivityAreaById(areas: ActivityArea[], areaId: string | null | undefined): ActivityArea | null {
  if (!areaId) return null;
  return normalizeActivityAreas(areas).find((area) => area.id === areaId) ?? null;
}

export function resolveActivityAreaFallbackMode(
  areas: ActivityArea[],
  areaId: string | null | undefined,
): ActivityAreaFallbackMode | null {
  const area = findActivityAreaById(areas, areaId);
  return area?.scheduling?.fallbackMode ?? null;
}

export function createActivityAreaId(label: string, existingAreas: ActivityArea[]): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'area';
  const existing = new Set(existingAreas.map((area) => area.id));
  let id = `area-${base}`;
  let index = 2;
  while (existing.has(id)) {
    id = `area-${base}-${index}`;
    index += 1;
  }
  return id;
}
