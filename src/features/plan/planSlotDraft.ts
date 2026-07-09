export type PlanSlotDraft = {
  start: Date;
  end: Date;
};

export function snapMinutesToStep(minutes: number, stepMinutes = 15): number {
  if (!Number.isFinite(minutes)) return 0;
  const safeStep = Number.isFinite(stepMinutes) && stepMinutes > 0 ? stepMinutes : 15;
  return Math.round(minutes / safeStep) * safeStep;
}

export function dateForTimelineY(params: {
  y: number;
  hourHeight: number;
  dayStart: Date;
  stepMinutes?: number;
}): Date {
  const safeHourHeight = Number.isFinite(params.hourHeight) && params.hourHeight > 0 ? params.hourHeight : 1;
  const rawMinutes = (Math.max(0, params.y) / safeHourHeight) * 60;
  const snapped = Math.max(0, Math.min(24 * 60, snapMinutesToStep(rawMinutes, params.stepMinutes ?? 15)));
  return new Date(params.dayStart.getTime() + snapped * 60_000);
}

export function clampSlotDraft(params: {
  start: Date;
  end: Date;
  dayStart: Date;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
}): PlanSlotDraft {
  const minDuration = params.minDurationMinutes ?? 15;
  const maxDuration = params.maxDurationMinutes ?? 240;
  const dayEnd = new Date(params.dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  let start = params.start <= params.end ? params.start : params.end;
  let end = params.start <= params.end ? params.end : params.start;
  start = new Date(Math.max(params.dayStart.getTime(), Math.min(dayEnd.getTime(), start.getTime())));
  end = new Date(Math.max(params.dayStart.getTime(), Math.min(dayEnd.getTime(), end.getTime())));

  const minEnd = new Date(start.getTime() + minDuration * 60_000);
  if (end < minEnd) end = minEnd;

  const maxEnd = new Date(start.getTime() + maxDuration * 60_000);
  if (end > maxEnd) end = maxEnd;

  if (end > dayEnd) {
    end = dayEnd;
    start = new Date(Math.max(params.dayStart.getTime(), end.getTime() - minDuration * 60_000));
  }

  return { start, end };
}
