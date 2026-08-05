import type { GoalDetailRouteParams } from './routeParams';

export function buildGoalSupportDestinationParams(goalId: string): GoalDetailRouteParams {
  return {
    goalId,
    entryPoint: 'goalsTab',
    initialTab: 'details',
    openActivitySheet: true,
  };
}
