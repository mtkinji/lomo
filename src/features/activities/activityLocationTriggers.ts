import type { Activity } from '../../domain/types';

export type ActivityLocationTrigger = 'arrive' | 'leave';

export type ActivityLocationPreview = {
  label: string;
  latitude: number;
  longitude: number;
};

export type ActivityLocationDraftState = {
  previewLocation: ActivityLocationPreview | null;
  trigger: ActivityLocationTrigger;
  radiusM: number;
};

export const LOCATION_RADIUS_FT_OPTIONS = [50, 100, 150, 300, 500] as const;
export const DEFAULT_LOCATION_RADIUS_FT = 150;
export const MIN_LOCATION_RADIUS_FT = 50;
export const MAX_LOCATION_RADIUS_FT = 2000;

const FEET_TO_METERS = 0.3048;
const COORDINATE_EPSILON = 1e-6;

type ActivityLocation = Activity['location'];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function feetToMeters(feet: number): number {
  return feet * FEET_TO_METERS;
}

export function clampLocationRadiusMeters(
  meters: number | null | undefined,
  options: {
    defaultRadiusFt?: number;
    minRadiusFt?: number;
    maxRadiusFt?: number;
  } = {},
): number {
  const defaultRadiusM = feetToMeters(options.defaultRadiusFt ?? DEFAULT_LOCATION_RADIUS_FT);
  const minRadiusM = feetToMeters(options.minRadiusFt ?? MIN_LOCATION_RADIUS_FT);
  const maxRadiusM = feetToMeters(options.maxRadiusFt ?? MAX_LOCATION_RADIUS_FT);
  const input = isFiniteNumber(meters) && meters > 0 ? meters : defaultRadiusM;
  return Math.max(minRadiusM, Math.min(maxRadiusM, input));
}

export function formatLocationRadiusLabel(meters: number): string {
  const metersClamped = clampLocationRadiusMeters(meters);
  const ft = Math.round(metersClamped / FEET_TO_METERS);
  return `${ft} feet`;
}

export function normalizeActivityLocation(location: ActivityLocation): ActivityLocationPreview | null {
  if (!location || !isFiniteNumber(location.latitude) || !isFiniteNumber(location.longitude)) {
    return null;
  }

  return {
    label: String(location.label ?? 'Selected location'),
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

export function resolveActivityLocationDraft(location: ActivityLocation): ActivityLocationDraftState {
  return {
    previewLocation: normalizeActivityLocation(location),
    trigger: location?.trigger === 'arrive' || location?.trigger === 'leave' ? location.trigger : 'leave',
    radiusM: clampLocationRadiusMeters(location?.radiusM),
  };
}

function sameCoordinate(left: number, right: number): boolean {
  return Math.abs(left - right) <= COORDINATE_EPSILON;
}

export function isActivityLocationDraftDirty(params: {
  savedLocation: ActivityLocation;
  draftLocation: ActivityLocationPreview | null;
  draftTrigger: ActivityLocationTrigger;
  draftRadiusM: number | null | undefined;
}): boolean {
  const savedLocation = normalizeActivityLocation(params.savedLocation);
  const hasSaved = Boolean(savedLocation);
  const hasDraft = Boolean(params.draftLocation);
  if (hasSaved !== hasDraft) return true;
  if (!hasSaved && !hasDraft) return false;
  if (!savedLocation || !params.draftLocation) return false;

  if (savedLocation.label !== params.draftLocation.label) return true;
  if (!sameCoordinate(savedLocation.latitude, params.draftLocation.latitude)) return true;
  if (!sameCoordinate(savedLocation.longitude, params.draftLocation.longitude)) return true;

  const savedTrigger =
    params.savedLocation?.trigger === 'arrive' || params.savedLocation?.trigger === 'leave'
      ? params.savedLocation.trigger
      : 'leave';
  if (savedTrigger !== params.draftTrigger) return true;

  const savedRadiusM = clampLocationRadiusMeters(params.savedLocation?.radiusM);
  const draftRadiusM = clampLocationRadiusMeters(params.draftRadiusM);
  return !sameCoordinate(savedRadiusM, draftRadiusM);
}

export function buildActivityLocationDraft(params: {
  previewLocation: ActivityLocationPreview | null;
  trigger: ActivityLocationTrigger;
  radiusM: number | null | undefined;
}): ActivityLocation {
  if (!params.previewLocation) return null;

  return {
    label: params.previewLocation.label,
    latitude: params.previewLocation.latitude,
    longitude: params.previewLocation.longitude,
    trigger: params.trigger,
    radiusM: clampLocationRadiusMeters(params.radiusM),
  };
}
