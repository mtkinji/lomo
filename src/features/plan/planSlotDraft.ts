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

export function minutesForTimelineTranslation(params: {
  translationY: number;
  hourHeight: number;
  stepMinutes?: number;
}): number {
  const safeHourHeight = Number.isFinite(params.hourHeight) && params.hourHeight > 0 ? params.hourHeight : 1;
  const rawMinutes = (params.translationY / safeHourHeight) * 60;
  return snapMinutesToStep(rawMinutes, params.stepMinutes ?? 15);
}

export function getTimelineScrollOffsetToRevealSlot(params: {
  slotTop: number;
  slotHeight: number;
  currentOffset: number;
  viewportHeight: number;
  bottomOverlayInset: number;
  margin?: number;
}): number {
  const margin = Math.max(0, params.margin ?? 0);
  const currentOffset = Math.max(0, params.currentOffset);
  const uncoveredHeight = Math.max(0, params.viewportHeight - params.bottomOverlayInset);
  const visibleBottom = currentOffset + uncoveredHeight;
  const requiredBottom = params.slotTop + params.slotHeight + margin;

  if (requiredBottom > visibleBottom) {
    return Math.max(0, currentOffset + requiredBottom - visibleBottom);
  }

  const requiredTop = params.slotTop - margin;
  if (requiredTop < currentOffset) return Math.max(0, requiredTop);
  return currentOffset;
}

export function getTimelineScrollOffsetToFocusSlot(params: {
  slotTop: number;
  topMargin?: number;
}): number {
  const slotTop = Math.max(0, params.slotTop);
  const topMargin = Math.max(0, params.topMargin ?? 0);
  return Math.max(0, slotTop - topMargin);
}

export function getTimelineScrollOffsetForSlot(params: {
  adjustmentActive: boolean;
  shouldFocusSlot: boolean;
  slotTop: number;
  slotHeight: number;
  currentOffset: number;
  viewportHeight: number;
  bottomOverlayInset: number;
  margin?: number;
}): number | null {
  if (params.adjustmentActive) return null;
  if (params.shouldFocusSlot) {
    return getTimelineScrollOffsetToFocusSlot({
      slotTop: params.slotTop,
      topMargin: params.margin,
    });
  }
  return getTimelineScrollOffsetToRevealSlot(params);
}

export function createDefaultSlotDraft(params: {
  tappedAt: Date;
  dayStart: Date;
  durationMinutes?: number;
  stepMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
}): PlanSlotDraft {
  const rawMinutes = (params.tappedAt.getTime() - params.dayStart.getTime()) / 60_000;
  const snappedMinutes = Math.max(
    0,
    Math.min(24 * 60, snapMinutesToStep(rawMinutes, params.stepMinutes ?? 15)),
  );
  const start = new Date(params.dayStart.getTime() + snappedMinutes * 60_000);
  const durationMinutes = params.durationMinutes ?? 60;
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return clampSlotDraft({
    start,
    end,
    dayStart: params.dayStart,
    minDurationMinutes: params.minDurationMinutes,
    maxDurationMinutes: params.maxDurationMinutes,
  });
}

export function adjustSlotDraft(params: {
  slot: PlanSlotDraft;
  edge: 'move' | 'start' | 'end';
  deltaMinutes: number;
  dayStart: Date;
  stepMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
}): PlanSlotDraft {
  const stepMinutes = params.stepMinutes ?? 15;
  const minDurationMinutes = params.minDurationMinutes ?? 15;
  const maxDurationMinutes = params.maxDurationMinutes ?? 240;
  const deltaMinutes = snapMinutesToStep(params.deltaMinutes, stepMinutes);
  const deltaMs = deltaMinutes * 60_000;
  const dayStartMs = params.dayStart.getTime();
  const dayEnd = new Date(params.dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const dayEndMs = dayEnd.getTime();
  const startMs = params.slot.start.getTime();
  const endMs = params.slot.end.getTime();

  if (params.edge === 'move') {
    const durationMs = Math.max(minDurationMinutes * 60_000, endMs - startMs);
    let nextStartMs = startMs + deltaMs;
    let nextEndMs = nextStartMs + durationMs;
    if (nextStartMs < dayStartMs) {
      nextStartMs = dayStartMs;
      nextEndMs = dayStartMs + durationMs;
    }
    if (nextEndMs > dayEndMs) {
      nextEndMs = dayEndMs;
      nextStartMs = dayEndMs - durationMs;
    }
    return { start: new Date(nextStartMs), end: new Date(nextEndMs) };
  }

  if (params.edge === 'start') {
    const earliestStartMs = Math.max(dayStartMs, endMs - maxDurationMinutes * 60_000);
    const latestStartMs = endMs - minDurationMinutes * 60_000;
    const nextStartMs = Math.max(earliestStartMs, Math.min(latestStartMs, startMs + deltaMs));
    return { start: new Date(nextStartMs), end: new Date(endMs) };
  }

  const earliestEndMs = startMs + minDurationMinutes * 60_000;
  const latestEndMs = Math.min(dayEndMs, startMs + maxDurationMinutes * 60_000);
  const nextEndMs = Math.max(earliestEndMs, Math.min(latestEndMs, endMs + deltaMs));
  return { start: new Date(startMs), end: new Date(nextEndMs) };
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
