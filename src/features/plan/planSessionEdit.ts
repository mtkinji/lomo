import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import type { PlanSlotDraft } from './planSlotDraft';

const ORIGINAL_INTERVAL_TOLERANCE_MS = 2 * 60_000;

export type PlanSessionEdit = {
  activityId: string;
  sessionId: string;
  original: PlanSlotDraft;
  draft: PlanSlotDraft;
};

export function createPlanSessionEdit(input: {
  activityId: string;
  sessionId: string;
  start: Date;
  end: Date;
}): PlanSessionEdit {
  const original = {
    start: new Date(input.start),
    end: new Date(input.end),
  };
  return {
    activityId: input.activityId,
    sessionId: input.sessionId,
    original,
    draft: {
      start: new Date(original.start),
      end: new Date(original.end),
    },
  };
}

export function updatePlanSessionEditDraft(
  edit: PlanSessionEdit,
  draft: PlanSlotDraft,
): PlanSessionEdit {
  return {
    ...edit,
    draft: {
      start: new Date(draft.start),
      end: new Date(draft.end),
    },
  };
}

export function isPlanSessionEditDirty(edit: PlanSessionEdit): boolean {
  return edit.original.start.getTime() !== edit.draft.start.getTime()
    || edit.original.end.getTime() !== edit.draft.end.getTime();
}

export function formatPlanSessionDuration(start: Date, end: Date): string {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  const hourText = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  return remainder === 0 ? hourText : `${hourText} ${remainder} min`;
}

function isOriginalInterval(edit: PlanSessionEdit, interval: BusyInterval): boolean {
  return Math.abs(interval.start.getTime() - edit.original.start.getTime()) <= ORIGINAL_INTERVAL_TOLERANCE_MS
    && Math.abs(interval.end.getTime() - edit.original.end.getTime()) <= ORIGINAL_INTERVAL_TOLERANCE_MS;
}

export function getPlanSessionEditConflict({
  edit,
  busyIntervals,
}: {
  edit: PlanSessionEdit;
  busyIntervals: BusyInterval[];
}): boolean {
  return busyIntervals.some((interval) => {
    if (isOriginalInterval(edit, interval)) return false;
    return interval.start < edit.draft.end && edit.draft.start < interval.end;
  });
}
