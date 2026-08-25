import type { CapabilityMenuDestinationId } from '../capabilities/types';

export type CapabilityPinOverrides = Partial<Record<CapabilityMenuDestinationId, boolean>>;

export const EMPTY_CAPABILITY_PIN_OVERRIDES: CapabilityPinOverrides = Object.freeze({});

const DEFAULT_PRIMARY_CAPABILITY_CLUSTERS = [
  ['money-summary', 'chores'],
  ['recipes', 'groceries'],
  ['todos', 'plan', 'goals'],
] as const satisfies readonly (readonly CapabilityMenuDestinationId[])[];

const DEFAULT_MORE_CAPABILITY_IDS = [
  'arcs',
  'chapters',
  'games',
  'explore',
] as const satisfies readonly CapabilityMenuDestinationId[];

const CAPABILITY_MENU_ORDER = [
  ...DEFAULT_PRIMARY_CAPABILITY_CLUSTERS.flat(),
  ...DEFAULT_MORE_CAPABILITY_IDS,
] as const satisfies readonly CapabilityMenuDestinationId[];

const DEFAULT_PINNED_CAPABILITY_IDS = new Set<CapabilityMenuDestinationId>(
  DEFAULT_PRIMARY_CAPABILITY_CLUSTERS.flat(),
);

export function isCapabilityPinned(
  id: CapabilityMenuDestinationId,
  overrides: CapabilityPinOverrides,
): boolean {
  return overrides[id] ?? DEFAULT_PINNED_CAPABILITY_IDS.has(id);
}

export function getCapabilityMenuTiers(overrides: CapabilityPinOverrides): {
  primaryClusters: CapabilityMenuDestinationId[][];
  moreCapabilityIds: CapabilityMenuDestinationId[];
} {
  const primaryClusters = DEFAULT_PRIMARY_CAPABILITY_CLUSTERS
    .map((cluster) => cluster.filter((id) => isCapabilityPinned(id, overrides)))
    .filter((cluster) => cluster.length > 0);
  const promotedCapabilityIds = DEFAULT_MORE_CAPABILITY_IDS.filter(
    (id) => isCapabilityPinned(id, overrides),
  );

  return {
    primaryClusters: promotedCapabilityIds.length > 0
      ? [...primaryClusters, promotedCapabilityIds]
      : primaryClusters,
    moreCapabilityIds: CAPABILITY_MENU_ORDER.filter(
      (id) => !isCapabilityPinned(id, overrides),
    ),
  };
}

export function setCapabilityPinOverride(
  overrides: CapabilityPinOverrides,
  id: CapabilityMenuDestinationId,
  pinned: boolean,
): CapabilityPinOverrides {
  const next = { ...overrides };
  if (pinned === DEFAULT_PINNED_CAPABILITY_IDS.has(id)) {
    delete next[id];
  } else {
    next[id] = pinned;
  }
  return next;
}

export function getCapabilityPinToastMessage(label: string, pinned: boolean): string {
  return `${label} ${pinned ? 'pinned' : 'unpinned'}`;
}
