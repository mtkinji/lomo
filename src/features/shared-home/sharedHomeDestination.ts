import type { SharedHomeDestination } from './sharedHomeTypes';

export type SharedHomeNavigationTarget =
  | [
      'MainTabs',
      {
        screen: 'GoalsTab';
        params: { screen: 'JoinSharedGoal'; params: { inviteCode: string } };
      },
    ]
  | ['Games', { screen: 'GamesRemote'; params: { sessionId: string } }];

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
  return ['Games', {
    screen: 'GamesRemote',
    params: { sessionId: destination.sessionId },
  }];
}
