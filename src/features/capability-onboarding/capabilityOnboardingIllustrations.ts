import type { ImageSourcePropType } from 'react-native';

import type { CapabilityOnboardingIllustrationKey } from './capabilityOnboardingContracts';

export const CAPABILITY_ONBOARDING_ILLUSTRATIONS: Record<
  CapabilityOnboardingIllustrationKey,
  ImageSourcePropType
> = {
  'money-app-control': require('../../../assets/illustrations/capability-onboarding/money-app-control.png'),
  'money-foundation': require('../../../assets/illustrations/capability-onboarding/money-foundation-v3.png'),
  meals: require('../../../assets/illustrations/capability-onboarding/meals.png'),
  goals: require('../../../assets/illustrations/goal-set.png'),
  chat: require('../../../assets/illustrations/capability-onboarding/chat-v2.png'),
  'screen-time': require('../../../assets/illustrations/notifications.png'),
  chores: require('../../../assets/illustrations/empty.png'),
  games: require('../../../assets/illustrations/aspirations.png'),
};
