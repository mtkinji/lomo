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
  entryPoint?: 'goalsTab' | 'arcsStack' | 'activitiesStack';
  /**
   * When true, open the Activity/Members tabbed sheet on mount.
   * Used by check-in nudges after activity completion.
   */
  openActivitySheet?: boolean;
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
  /**
   * When true, ActivityDetail should immediately start a Focus session (best-effort).
   * This is primarily used by iOS ecosystem entrypoints (widgets/Shortcuts/Spotlight)
   * that want a single-tap "Start Focus" experience while still routing into the
   * existing shell/canvas.
   *
   * Example: `kwilt://activity/<id>?autoStartFocus=1&minutes=25`
   */
  autoStartFocus?: boolean;
  /**
   * Optional Focus duration for `autoStartFocus`, in minutes.
   */
  minutes?: number;
  /**
   * When true, ActivityDetail should best-effort end any in-progress Focus session for this activity.
   * Used by iOS ecosystem surfaces (e.g. Shortcuts) to stop Focus via deep link.
   *
   * Example: `kwilt://activity/<id>?endFocus=1`
   */
  endFocus?: boolean;
  /**
   * Optional source tag for ecosystem-driven entrypoints.
   * Used for adoption measurement + one-time nudge completion (e.g. widgets).
   *
   * Example: `kwilt://activity/<id>?source=widget`
   */
  source?: string;
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
  /**
   * Optional context binding (e.g. from iOS Focus Filters) that narrows initial state
   * without introducing any new navigation surface area.
   *
   * Example: `kwilt://today?contextGoalId=<goalId>`
   */
  contextGoalId?: string;
  /**
   * Optional source tag for ecosystem-driven entrypoints.
   *
   * Example: `kwilt://today?source=widget`
   */
  source?: string;
  /**
   * When true, open the Activities search drawer on mount.
   */
  openSearch?: boolean;
};

export type ActivitiesWidgetRouteParams = {
  /**
   * Activity view id to select on open (saved view/system view).
   * Passed by the Activities widget configuration.
   */
  viewId?: string;
  /**
   * Optional source tag for ecosystem-driven entrypoints.
   *
   * Example: `kwilt://activities?viewId=default&source=widget`
   */
  source?: string;
};

export type JoinSharedGoalRouteParams = {
  inviteCode: string;
};


