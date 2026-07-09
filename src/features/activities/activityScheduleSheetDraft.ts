export type ActivityScheduleSheetDraft = {
  draftStart: Date;
  durationDraft: string;
  targetDate: Date;
};

type ResolveActivityScheduleSheetDraftInput = {
  scheduledAt: string | null | undefined;
  estimateMinutes: number | null | undefined;
  now?: Date;
};

const SCHEDULE_START_GRACE_MS = 60_000;
const SCHEDULE_START_STEP_MS = 15 * 60_000;

function roundUpToNextScheduleBoundary(date: Date): Date {
  return new Date(Math.ceil(date.getTime() / SCHEDULE_START_STEP_MS) * SCHEDULE_START_STEP_MS);
}

export function resolveActivityScheduleSheetDraft({
  scheduledAt,
  estimateMinutes,
  now = new Date(),
}: ResolveActivityScheduleSheetDraftInput): ActivityScheduleSheetDraft {
  const existingStart = scheduledAt ? new Date(scheduledAt) : null;
  const existingIsValid = Boolean(existingStart && !Number.isNaN(existingStart.getTime()));
  const existingIsReasonablyFuture =
    existingIsValid && (existingStart as Date).getTime() > now.getTime() - SCHEDULE_START_GRACE_MS;
  const draftStart = existingIsReasonablyFuture
    ? (existingStart as Date)
    : roundUpToNextScheduleBoundary(now);

  return {
    draftStart,
    durationDraft: String(Math.max(5, Math.round(estimateMinutes ?? 30))),
    targetDate: new Date(draftStart),
  };
}
