import type { IconName } from '../../ui/Icon';

export type CapabilityOnboardingPathId =
  | 'budget-app-controls'
  | 'make-meals-easier'
  | 'make-progress'
  | 'ask-kwilt'
  | 'screen-time-controls'
  | 'household-chores'
  | 'play-together';

export type CapabilityOnboardingPromotionState = 'development' | 'production';

export type CapabilityOnboardingIllustrationKey =
  | 'money-app-control'
  | 'money-foundation'
  | 'meals'
  | 'goals'
  | 'chat'
  | 'screen-time'
  | 'chores'
  | 'games';

export type CapabilityOnboardingHandoff =
  | { kind: 'money-app-control' }
  | { kind: 'food-meal-loop' }
  | { kind: 'identity-workflow' }
  | { kind: 'unified-chat' }
  | { kind: 'screen-time-setup' }
  | { kind: 'chores-setup' }
  | { kind: 'games-entry' };

export type CapabilityOnboardingContract = {
  id: CapabilityOnboardingPathId;
  reelRank: number | null;
  story: {
    headline: string;
    body: string;
    actionLabel: string;
    illustrationKey: CapabilityOnboardingIllustrationKey | null;
    illustrationLabel: string;
  };
  icon: IconName;
  archetype: 'guided-creation' | 'illustrated-setup';
  coordinatorOwnerId: string;
  terminalOwnerIds: readonly string[];
  promotionState: CapabilityOnboardingPromotionState;
  handoff: CapabilityOnboardingHandoff;
  firstValue: {
    event: string;
    evidenceSource: string;
  };
  nativeLanding: {
    root: string;
    screen?: string;
  };
};

export const CAPABILITY_ONBOARDING_PATHS = [
  {
    id: 'budget-app-controls',
    reelRank: 1,
    story: {
      headline: 'Know where you stand before you spend',
      body:
        'Connect the accounts that matter and Kwilt will build a useful monthly view from real income and spending.',
      actionLabel: 'Set up Money',
      illustrationKey: 'money-foundation',
      illustrationLabel: 'Money brought into one clear monthly view',
    },
    icon: 'creditCard',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'money',
    terminalOwnerIds: ['money'],
    promotionState: 'development',
    handoff: { kind: 'money-app-control' },
    firstValue: {
      event: 'money_foundation_completed',
      evidenceSource: 'Money onboarding completion and authoritative plan state',
    },
    nativeLanding: { root: 'Money', screen: 'MoneySummary' },
  },
  {
    id: 'make-meals-easier',
    reelRank: 2,
    story: {
      headline: 'Make meals easier',
      body:
        'Choose meals together, turn them into one shared grocery list, and keep each recipe easy to follow while you cook.',
      actionLabel: 'Choose meal',
      illustrationKey: 'meals',
      illustrationLabel: 'A family choosing a meal and building one grocery list',
    },
    icon: 'cookingPot',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'household-food',
    terminalOwnerIds: ['meal-planning', 'recipes', 'groceries'],
    promotionState: 'development',
    handoff: { kind: 'food-meal-loop' },
    firstValue: {
      event: 'meal_plan_created',
      evidenceSource: 'create_kwilt_meal_plan receipt',
    },
    nativeLanding: { root: 'Food', screen: 'RecipeLibrary' },
  },
  {
    id: 'make-progress',
    reelRank: 3,
    story: {
      headline: 'Turn one goal into a clear plan',
      body:
        'Answer a few questions to shape one realistic goal and the next steps to move it forward.',
      actionLabel: 'Create goal',
      illustrationKey: 'goals',
      illustrationLabel: 'A person turning an aspiration into a practical plan',
    },
    icon: 'goals',
    archetype: 'guided-creation',
    coordinatorOwnerId: 'onboarding',
    terminalOwnerIds: ['arcs', 'goals'],
    promotionState: 'production',
    handoff: { kind: 'identity-workflow' },
    firstValue: {
      event: 'goal_created',
      evidenceSource: 'useAppStore.lastOnboardingGoalId',
    },
    nativeLanding: { root: 'MainTabs', screen: 'GoalDetail' },
  },
  {
    id: 'ask-kwilt',
    reelRank: 4,
    story: {
      headline: 'Tell Kwilt what you need',
      body:
        'Ask in your own words. Kwilt can help with goals, plans, meals, chores, and more—and you review every change first.',
      actionLabel: 'Ask Kwilt',
      illustrationKey: 'chat',
      illustrationLabel: 'A conversation connecting several parts of family life',
    },
    icon: 'aiGuide',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'unifiedChat',
    terminalOwnerIds: ['unifiedChat'],
    promotionState: 'development',
    handoff: { kind: 'unified-chat' },
    firstValue: {
      event: 'unified_chat_user_message_sent',
      evidenceSource: 'durable Unified Chat user message',
    },
    nativeLanding: { root: 'UnifiedChat' },
  },
  {
    id: 'screen-time-controls',
    reelRank: null,
    story: {
      headline: 'Set clear Screen Time limits',
      body:
        'Choose the apps to limit and when Kwilt should block them. Review the rule before it takes effect.',
      actionLabel: 'Set limits',
      illustrationKey: 'screen-time',
      illustrationLabel: 'A calm boundary around distracting apps',
    },
    icon: 'shield',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'screen-time',
    terminalOwnerIds: ['screen-time'],
    promotionState: 'development',
    handoff: { kind: 'screen-time-setup' },
    firstValue: {
      event: 'screen_time_rule_saved',
      evidenceSource: 'rule delivery receipt',
    },
    nativeLanding: { root: 'Settings', screen: 'SettingsScreenTimeProtection' },
  },
  {
    id: 'household-chores',
    reelRank: null,
    story: {
      headline: 'Share the household chores',
      body: 'Add what needs doing, assign each chore, and let everyone see what’s theirs.',
      actionLabel: 'Add chore',
      illustrationKey: 'chores',
      illustrationLabel: 'A household sharing a short chore list',
    },
    icon: 'clipboard',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'chores',
    terminalOwnerIds: ['chores'],
    promotionState: 'development',
    handoff: { kind: 'chores-setup' },
    firstValue: {
      event: 'chore_created',
      evidenceSource: 'chore repository receipt',
    },
    nativeLanding: { root: 'Chores' },
  },
  {
    id: 'play-together',
    reelRank: null,
    story: {
      headline: 'Find a game that fits your group',
      body: 'Choose based on who is playing and how much time you have, then start together.',
      actionLabel: 'Find game',
      illustrationKey: 'games',
      illustrationLabel: 'A household beginning a game together',
    },
    icon: 'dices',
    archetype: 'illustrated-setup',
    coordinatorOwnerId: 'games',
    terminalOwnerIds: ['games'],
    promotionState: 'development',
    handoff: { kind: 'games-entry' },
    firstValue: {
      event: 'game_started',
      evidenceSource: 'game session receipt',
    },
    nativeLanding: { root: 'Games' },
  },
] as const satisfies readonly CapabilityOnboardingContract[];

export function getCapabilityOnboardingPaths(
  surface: 'development' | 'production',
): CapabilityOnboardingContract[] {
  return CAPABILITY_ONBOARDING_PATHS.filter(
    (path) => surface === 'development' || path.promotionState === 'production',
  );
}

export function getCapabilityOnboardingDoors(
  surface: 'development' | 'production',
): CapabilityOnboardingContract[] {
  const doors = getCapabilityOnboardingPaths(surface)
    .filter((path) => path.reelRank !== null)
    .sort((left, right) => (left.reelRank ?? Number.MAX_SAFE_INTEGER) - (right.reelRank ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 6);

  if (__DEV__) {
    const ranks = doors.map(({ reelRank }) => reelRank);
    if (new Set(ranks).size !== ranks.length) {
      throw new Error('Capability onboarding door ranks must be unique.');
    }
  }

  return doors;
}
