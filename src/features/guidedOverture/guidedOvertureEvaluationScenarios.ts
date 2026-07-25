import type {
  GuidedOvertureEntry,
  GuidedOvertureStartingPoint,
} from './guidedOvertureEntryPolicy';

export type GuidedOverturePersonaScenario = {
  persona: 'Maya' | 'Marcus' | 'Nina' | 'Sarah' | 'Elena' | 'David';
  audienceId: string;
  heroJtbd: string;
  startingPoint: GuidedOvertureStartingPoint;
  expectedEntry: GuidedOvertureEntry;
  relevantOfferIds: readonly string[];
  primaryRisk: string;
};

/**
 * Research fixtures, not personalization rules. These scenarios make the
 * neutral composition answerable against every canonical Kwilt persona.
 */
export const GUIDED_OVERTURE_PERSONA_SCENARIOS: readonly GuidedOverturePersonaScenario[] = [
  {
    persona: 'Maya',
    audienceId: 'audience-aspirational-family-organizers',
    heroJtbd: 'jtbd-move-the-few-things-that-matter',
    startingPoint: 'unscoped-download',
    expectedEntry: 'guided-overture',
    relevantOfferIds: ['plan-tomorrow', 'photo-story', 'pick-game', 'invite-support'],
    primaryRisk: 'The opening feels like project-management setup instead of ordinary family help.',
  },
  {
    persona: 'Marcus',
    audienceId: 'audience-burned-out-productivity-power-users',
    heroJtbd: 'jtbd-move-the-few-things-that-matter',
    startingPoint: 'unscoped-download',
    expectedEntry: 'guided-overture',
    relevantOfferIds: ['plan-tomorrow', 'sort-week'],
    primaryRisk: 'The opening looks like another place to maintain tasks instead of decision relief.',
  },
  {
    persona: 'Nina',
    audienceId: 'audience-ai-native-life-operators',
    heroJtbd: 'jtbd-trust-this-app-with-my-life',
    startingPoint: 'unscoped-download',
    expectedEntry: 'guided-overture',
    relevantOfferIds: ['sort-week'],
    primaryRisk: 'Agent help is hidden or implies silent action instead of inspectable assistance.',
  },
  {
    persona: 'Sarah',
    audienceId: 'audience-faith-and-values-driven-builders',
    heroJtbd: 'jtbd-see-who-im-becoming',
    startingPoint: 'unscoped-download',
    expectedEntry: 'guided-overture',
    relevantOfferIds: ['plan-tomorrow', 'sort-week'],
    primaryRisk: 'Practical tasks lose their connection to what matters without becoming abstract.',
  },
  {
    persona: 'Elena',
    audienceId: 'audience-life-transition-restarters',
    heroJtbd: 'jtbd-recover-when-i-drift-from-an-arc',
    startingPoint: 'returning-user',
    expectedEntry: 'app-shell',
    relevantOfferIds: ['sort-week'],
    primaryRisk: 'Generic onboarding interrupts her return or frames stale plans as failure.',
  },
  {
    persona: 'David',
    audienceId: 'audience-private-accountability-seekers',
    heroJtbd: 'jtbd-invite-the-right-people-in',
    startingPoint: 'invitation',
    expectedEntry: 'exact-destination',
    relevantOfferIds: ['invite-support'],
    primaryRisk: 'Generic orientation delays the invitation or makes sharing boundaries unclear.',
  },
];

export const GUIDED_OVERTURE_OUTCOME_COVERAGE = [
  { outcome: 'be more productive', offerIds: ['plan-tomorrow', 'sort-week'] },
  { outcome: 'be happier', offerIds: ['photo-story', 'pick-game'] },
  { outcome: 'save money', offerIds: ['catch-bill'] },
  { outcome: 'connect with each other', offerIds: ['invite-support', 'pick-game'] },
  { outcome: 'bring an unlisted need', offerIds: ['sort-week'] },
] as const;
