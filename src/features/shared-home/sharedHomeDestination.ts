import type { SharedHomeDestination } from './sharedHomeTypes';

export type SharedHomeNavigationTarget =
  | [
      'MainTabs',
      {
        screen: 'GoalsTab';
        params: { screen: 'JoinSharedGoal'; params: { inviteCode: string } };
      },
    ]
  | [
      'MainTabs',
      {
        screen: 'GoalsTab';
        params: {
          screen: 'GoalDetail';
          params: { goalId: string; entryPoint: 'goalsTab' };
        };
      },
    ]
  | ['Games', { screen: 'GamesRemote'; params: { sessionId: string } }]
  | ['Food', { screen: 'MealChoiceResponse'; params: { roundId: string } }];

export function resolveSharedHomeDestination(
  destination: SharedHomeDestination,
): SharedHomeNavigationTarget {
  if (destination.kind === 'goal_invite') {
    return [
      'MainTabs',
      {
        screen: 'GoalsTab',
        params: {
          screen: 'JoinSharedGoal',
          params: { inviteCode: destination.inviteCode },
        },
      },
    ];
  }
  if (destination.kind === 'goal') {
    return [
      'MainTabs',
      {
        screen: 'GoalsTab',
        params: {
          screen: 'GoalDetail',
          params: { goalId: destination.goalId, entryPoint: 'goalsTab' },
        },
      },
    ];
  }
  if (destination.kind === 'meal_choice') {
    return ['Food', {
      screen: 'MealChoiceResponse',
      params: { roundId: destination.roundId },
    }];
  }
  return ['Games', {
    screen: 'GamesRemote',
    params: { sessionId: destination.sessionId },
  }];
}
