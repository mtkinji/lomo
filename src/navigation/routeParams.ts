/**
 * Route param types extracted from `RootNavigator.tsx` to avoid require cycles.
 *
 * Screens should import these types instead of importing from `RootNavigator`,
 * because `RootNavigator` imports screens (creating a runtime cycle if a screen
 * imports `RootNavigator` back).
 */

export type GoalDetailRouteParams = {
  goalId: string;
  /**
   * Optional initial tab hint. Used by notification deep links (goal nudges)
   * and post-goal handoff flows to land on the most relevant canvas.
   */
  initialTab?: 'details' | 'plan' | 'history';
  /**
   * Optional hint about where the user navigated from. When set to
   * "goalsTab", the Goal detail back affordance should return to the Goals
   * canvas rather than stepping back through any existing Arcs stack
   * history.
   */
  entryPoint?: 'goalsTab' | 'arcsStack';
};

export type ActivityDetailRouteParams = {
  activityId: string;
  /**
   * Optional hint about where the Activity detail screen was opened from.
   * When set to "goalPlan", the back affordance should return to the
   * originating Goal canvas instead of the Activities list.
   */
  entryPoint?: 'activitiesCanvas' | 'goalPlan';
  /**
   * When true, ActivityDetail should open Focus mode UI immediately on mount.
   * Used by deep links embedded in calendar events (e.g. `kwilt://activity/<id>?openFocus=1`).
   */
  openFocus?: boolean;
};

export type ActivitiesListRouteParams = {
  /**
   * When true, the Activities canvas will scroll to and highlight the Suggested card.
   * Used by notification deep links (setupNextStep).
   */
  highlightSuggested?: boolean;
  /**
   * Optional hint for showing the most relevant Suggested content.
   */
  suggestedSource?: 'notification' | 'manual';
};

export type JoinSharedGoalRouteParams = {
  inviteCode: string;
};


