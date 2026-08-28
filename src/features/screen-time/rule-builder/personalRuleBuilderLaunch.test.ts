import { resolveContextualPersonalRuleBuilderLaunch } from './personalRuleBuilderLaunch';

describe('resolveContextualPersonalRuleBuilderLaunch', () => {
  it('opens the suggested rule in the standard Settings stack when Screen Time is already approved', () => {
    expect(resolveContextualPersonalRuleBuilderLaunch({
      authorizationStatus: 'approved',
      activityId: 'activity-42',
      suggestedKind: 'focus',
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
    })).toEqual({
      kind: 'builder',
      route: {
        screen: 'SettingsScreenTimeRuleBuilder',
        params: {
          entry: 'contextual',
          suggestedKind: 'focus',
          setupIntent: 'focus_sessions',
          entrySurface: 'focus_drawer',
        },
      },
    });
  });

  it.each(['notDetermined', 'denied', 'revoked', 'unavailable'] as const)(
    'keeps the existing authorization route for %s access',
    (authorizationStatus) => {
      expect(resolveContextualPersonalRuleBuilderLaunch({
        authorizationStatus,
        activityId: 'activity-42',
        suggestedKind: 'focus',
        setupIntent: 'focus_sessions',
        entrySurface: 'focus_drawer',
      })).toEqual({
        kind: 'setup',
        route: {
          screen: 'SettingsScreenTimeProtection',
          params: {
            setupIntent: 'focus_sessions',
            entrySurface: 'focus_drawer',
            returnToActivityId: 'activity-42',
          },
        },
      });
    },
  );
});
