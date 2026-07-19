type GoalTargetDatePickerDefaultParams = {
  targetDate?: string | null;
  now?: Date;
};

export function resolveInitialGoalTargetDateForPicker({
  targetDate,
  now = new Date(),
}: GoalTargetDatePickerDefaultParams): Date {
  const existing = targetDate ? Date.parse(targetDate) : NaN;
  if (Number.isFinite(existing)) return new Date(existing);

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 14);
  fallback.setHours(23, 0, 0, 0);
  return fallback;
}
