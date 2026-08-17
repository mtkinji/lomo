export type GoalTargetDateMutationPatch = {
  targetDate: string | undefined;
  qualityState: 'draft' | 'ready';
  updatedAt: string;
};

type GoalTargetDatePatchParams = {
  hasMetrics: boolean;
  now?: Date;
};

type GoalTargetDateOffsetPatchParams = GoalTargetDatePatchParams & {
  offsetDays: number;
};

type GoalTargetDateSelectionPatchParams = GoalTargetDatePatchParams & {
  date: Date;
};

function toLocalEndOfDay(date: Date): string {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 0, 0, 0);
  return endOfDay.toISOString();
}

function buildGoalTargetDatePatch(
  date: Date,
  { hasMetrics, now = new Date() }: GoalTargetDatePatchParams,
): GoalTargetDateMutationPatch {
  return {
    targetDate: toLocalEndOfDay(date),
    qualityState: hasMetrics ? 'ready' : 'draft',
    updatedAt: now.toISOString(),
  };
}

export function buildGoalTargetDateOffsetPatch({
  offsetDays,
  hasMetrics,
  now = new Date(),
}: GoalTargetDateOffsetPatchParams): GoalTargetDateMutationPatch {
  const date = new Date(now);
  date.setDate(date.getDate() + offsetDays);
  return buildGoalTargetDatePatch(date, { hasMetrics, now });
}

export function buildGoalTargetDateSelectionPatch({
  date,
  hasMetrics,
  now = new Date(),
}: GoalTargetDateSelectionPatchParams): GoalTargetDateMutationPatch {
  return buildGoalTargetDatePatch(date, { hasMetrics, now });
}

export function buildClearedGoalTargetDatePatch({
  now = new Date(),
}: {
  now?: Date;
} = {}): GoalTargetDateMutationPatch {
  return {
    targetDate: undefined,
    qualityState: 'draft',
    updatedAt: now.toISOString(),
  };
}
