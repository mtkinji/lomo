import type { Activity } from '../../domain/types';

export type ActivityLocationAlert = 'off' | 'arrive' | 'leave';

export type ActivityLocationPlace = Pick<
  NonNullable<Activity['location']>,
  'label' | 'latitude' | 'longitude'
>;

export type ActivityLocationDraft = {
  place: ActivityLocationPlace | null;
  alert: ActivityLocationAlert;
  radiusM: number;
};

export function serializeActivityLocationDraft(
  draft: ActivityLocationDraft,
): Activity['location'] {
  if (!draft.place) return null;
  if (draft.alert === 'off') return { ...draft.place };

  return {
    ...draft.place,
    trigger: draft.alert,
    radiusM: draft.radiusM,
  };
}

function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6;
}

export function isActivityLocationDraftDirty(params: {
  saved: Activity['location'];
  draft: ActivityLocationDraft;
}): boolean {
  const { saved, draft } = params;
  if (Boolean(saved) !== Boolean(draft.place)) return true;
  if (!saved || !draft.place) return false;

  if (String(saved.label ?? '') !== String(draft.place.label ?? '')) return true;
  if (!sameNumber(saved.latitude, draft.place.latitude)) return true;
  if (!sameNumber(saved.longitude, draft.place.longitude)) return true;

  const savedAlert: ActivityLocationAlert =
    saved.trigger === 'arrive' || saved.trigger === 'leave' ? saved.trigger : 'off';
  if (savedAlert !== draft.alert) return true;

  if (draft.alert !== 'off') {
    if (typeof saved.radiusM !== 'number' || !Number.isFinite(saved.radiusM)) return true;
    if (!sameNumber(saved.radiusM, draft.radiusM)) return true;
  }

  return false;
}
