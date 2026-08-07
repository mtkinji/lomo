export type GoalRouteCheckinApprovalAction = 'reset' | 'wait' | 'schedule-open';

type GoalRouteCheckinApprovalDecisionInput = {
  openRequested: boolean;
  isFocused: boolean;
  hasPendingDraft: boolean;
  hasOpenedRequest: boolean;
};

export function selectGoalRouteCheckinApprovalAction({
  openRequested,
  isFocused,
  hasPendingDraft,
  hasOpenedRequest,
}: GoalRouteCheckinApprovalDecisionInput): GoalRouteCheckinApprovalAction {
  if (!openRequested) return 'reset';
  if (!isFocused || !hasPendingDraft || hasOpenedRequest) return 'wait';
  return 'schedule-open';
}
