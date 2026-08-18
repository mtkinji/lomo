import type {
  PersonalScreenTimeRuleKind,
  ScreenTimeAuthorizationStatus,
  ScreenTimeSetupIntent,
  ScreenTimeSetupOfferSurface,
} from '../../../services/screenTimeProtection';

export type PersonalScreenTimeRuleBuilderParams = {
  entry: 'inventory' | 'contextual';
  suggestedKind?: PersonalScreenTimeRuleKind;
  suggestedLimitMinutes?: number;
  suggestedAppLabel?: string;
  setupIntent?: ScreenTimeSetupIntent;
  entrySurface?: ScreenTimeSetupOfferSurface;
};

type ContextualPersonalRuleBuilderLaunchInput = {
  authorizationStatus: ScreenTimeAuthorizationStatus;
  activityId: string;
  suggestedKind: PersonalScreenTimeRuleKind;
  setupIntent: ScreenTimeSetupIntent;
  entrySurface: ScreenTimeSetupOfferSurface;
};

export type ContextualPersonalRuleBuilderLaunch =
  | {
      kind: 'drawer';
      params: PersonalScreenTimeRuleBuilderParams;
    }
  | {
      kind: 'setup';
      route: {
        screen: 'SettingsScreenTimeProtection';
        params: {
          setupIntent: ScreenTimeSetupIntent;
          entrySurface: ScreenTimeSetupOfferSurface;
          returnToActivityId: string;
        };
      };
    };

export function resolveContextualPersonalRuleBuilderLaunch(
  input: ContextualPersonalRuleBuilderLaunchInput,
): ContextualPersonalRuleBuilderLaunch {
  if (input.authorizationStatus === 'approved') {
    return {
      kind: 'drawer',
      params: {
        entry: 'contextual',
        suggestedKind: input.suggestedKind,
        setupIntent: input.setupIntent,
        entrySurface: input.entrySurface,
      },
    };
  }

  return {
    kind: 'setup',
    route: {
      screen: 'SettingsScreenTimeProtection',
      params: {
        setupIntent: input.setupIntent,
        entrySurface: input.entrySurface,
        returnToActivityId: input.activityId,
      },
    },
  };
}
