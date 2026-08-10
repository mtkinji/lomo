type GoalCheckinLifecycleDependencies = {
  recordSkipped: (input: { goalId: string; itemCount: number }) => void;
  markSkipped: (goalId: string) => void;
  recordItemRemoved: (input: { goalId: string; itemId: string }) => void;
  removeItem: (input: { goalId: string; itemId: string }) => void;
  hideApproval: () => void;
  markDismissed: (goalId: string) => void;
  recordDismissed: (goalId: string) => void;
};

export function skipPendingGoalCheckin(
  input: { goalId: string | null | undefined; itemCount: number },
  dependencies: GoalCheckinLifecycleDependencies,
): void {
  if (!input.goalId) return;
  dependencies.recordSkipped({ goalId: input.goalId, itemCount: input.itemCount });
  dependencies.markSkipped(input.goalId);
}

export function removePendingGoalCheckinItem(
  input: { goalId: string | null | undefined; itemId: string },
  dependencies: GoalCheckinLifecycleDependencies,
): void {
  if (!input.goalId) return;
  dependencies.recordItemRemoved({ goalId: input.goalId, itemId: input.itemId });
  dependencies.removeItem({ goalId: input.goalId, itemId: input.itemId });
}

export function dismissGoalCheckinApproval(
  goalId: string | null | undefined,
  dependencies: GoalCheckinLifecycleDependencies,
): void {
  dependencies.hideApproval();
  if (!goalId) return;
  dependencies.markDismissed(goalId);
  dependencies.recordDismissed(goalId);
}
