export type GoalCheckinDeliveryRequest = {
  goalId: string;
  text: string;
  itemCount: number;
};

export type GoalCheckinDeliveryDependencies = {
  setBusy: (busy: boolean) => void;
  submit: (input: { goalId: string; text: string }) => Promise<void>;
  recordSuccess: (input: { goalId: string; itemCount: number }) => void;
  markDraftSent: (goalId: string) => void;
  recordCheckin: (goalId: string) => void;
  refreshFeed: () => void;
  showSuccess: () => void;
  recordFailure: (input: { goalId: string; error: string }) => void;
  showFailure: (message: string) => void;
};

export async function deliverGoalCheckin(
  request: GoalCheckinDeliveryRequest,
  dependencies: GoalCheckinDeliveryDependencies,
): Promise<void> {
  dependencies.setBusy(true);
  try {
    await dependencies.submit({ goalId: request.goalId, text: request.text });
    dependencies.recordSuccess({
      goalId: request.goalId,
      itemCount: request.itemCount,
    });
    dependencies.markDraftSent(request.goalId);
    dependencies.recordCheckin(request.goalId);
    dependencies.refreshFeed();
    dependencies.showSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send check-in';
    dependencies.recordFailure({ goalId: request.goalId, error: message });
    dependencies.showFailure(message);
  } finally {
    dependencies.setBusy(false);
  }
}
