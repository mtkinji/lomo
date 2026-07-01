import type { ArchetypeAdmiredQualityId, ArchetypeRoleModelTypeId } from './archetypeTaps';

export type ArcCreationSurveyV1StepId =
  | 'dreams'
  | 'whyNow'
  | 'domain'
  | 'proudMoment'
  | 'motivation'
  | 'roleModelType'
  | 'admiredQualities';

export type ArcCreationSurveyStepId =
  | 'identityDirection'
  | 'primaryArena'
  | 'whyNow'
  | 'howThisShowsUpSeeds'
  | 'driftPatterns'
  | 'practiceStyle'
  | 'personalTexture';

export type FtuxGoalArcSurveyStepId =
  | 'category'
  | 'concreteFocus'
  | 'goalShape'
  | 'motivation'
  | 'identityBridge';

export type IdentityDirectionKey =
  | 'steadiness'
  | 'follow_through'
  | 'vitality'
  | 'build_something_real'
  | 'capability'
  | 'alignment'
  | 'custom';

export type PrimaryArenaKey =
  | 'family'
  | 'health'
  | 'sports_movement'
  | 'work'
  | 'creative_work'
  | 'faith_meaning'
  | 'money'
  | 'learning'
  | 'community'
  | 'home'
  | 'adventure'
  | 'custom';

export type WhyNowKey =
  | 'drifting'
  | 'enjoyment'
  | 'new_season'
  | 'old_pattern'
  | 'responsibility'
  | 'creative_calling'
  | 'misaligned'
  | 'self_trust'
  | 'unsure';

export type DriftPatternKey =
  | 'distraction'
  | 'exhaustion'
  | 'perfectionism'
  | 'fear_of_starting'
  | 'too_many_ideas'
  | 'lack_of_structure'
  | 'saying_yes_too_much'
  | 'losing_momentum'
  | 'emotional_reactivity'
  | 'unclear_next_step'
  | 'custom';

export type PracticeStyleKey =
  | 'daily_rhythm'
  | 'weekly_ritual'
  | 'clear_project'
  | 'simple_checklist'
  | 'habit_stack'
  | 'reflection_prompt'
  | 'accountability'
  | 'recommend';

export type PersonalTextureTonePreference =
  | 'include_family'
  | 'include_faith'
  | 'include_creative_work'
  | 'include_health'
  | 'more_practical'
  | 'more_inspiring'
  | 'gentler'
  | 'more_ambitious';

export type PersonalTexture = {
  freeText?: string;
  tonePreferences?: PersonalTextureTonePreference[];
};

export type GoalShapeKey =
  | 'show_up_consistently'
  | 'improve_one_part'
  | 'prepare_for_something'
  | 'make_time'
  | 'finish_complete'
  | 'get_organized'
  | 'confidence'
  | 'change_pattern'
  | 'custom';

export type FtuxCategoryKey =
  | 'skill_hobby'
  | 'project_creative'
  | 'health_energy'
  | 'school_work'
  | 'money_home'
  | 'relationships'
  | 'faith_values'
  | 'habit_change'
  | 'custom';

export type FtuxMotivationKey =
  | 'enjoyment'
  | 'improve'
  | 'energy'
  | 'life_works_better'
  | 'people_i_care_about'
  | 'part_of_me'
  | 'dont_want_to_lose'
  | 'custom';

export type IdentityBridgeKey =
  | 'showing_up'
  | 'steady_when_hard'
  | 'practice_growth'
  | 'recover_setbacks'
  | 'responsibility'
  | 'present_with_people'
  | 'live_values'
  | 'custom';

export type ResistanceKey =
  | 'starting'
  | 'sticking_with_it'
  | 'distraction'
  | 'discouragement'
  | 'comparison'
  | 'unclear_next_step'
  | 'tired_overloaded'
  | 'custom';

export type ArcSurveyOption<TKey extends string = string> = {
  id: TKey;
  key: TKey;
  label: string;
  generationMeaning?: string;
  relatedArcLanguage?: string[];
  allowsCustomText?: boolean;
};

export type HowThisShowsUpOption = ArcSurveyOption<string>;

export type ArcSurveyV1Response = {
  version?: 1;
  dreams?: string[] | string;
  dream?: string;
  whyNow?: string | null;
  whyNowId?: string | null;
  domain?: string | null;
  domainId?: string | null;
  proudMoment?: string | null;
  proudMomentId?: string | null;
  motivation?: string | null;
  motivationId?: string | null;
  roleModelType?: string | null;
  roleModelTypeId?: ArchetypeRoleModelTypeId | null;
  admiredQualities?: string[] | null;
  admiredQualityIds?: ArchetypeAdmiredQualityId[] | null;
};

export type ArcSurveyV2Response = {
  version: 2;
  identityDirection: {
    key: IdentityDirectionKey;
    label: string;
    generationMeaning?: string;
    customText?: string;
  };
  primaryArena: {
    key: PrimaryArenaKey;
    label: string;
    customText?: string;
  };
  whyNow: {
    key: WhyNowKey;
    label: string;
    generationMeaning?: string;
  };
  howThisShowsUpSeeds: Array<{
    key: string;
    label: string;
    generationMeaning?: string;
    customText?: string;
  }>;
  driftPatterns: Array<{
    key: DriftPatternKey;
    label: string;
    generationMeaning?: string;
    customText?: string;
  }>;
  practiceStyle: {
    key: PracticeStyleKey;
    label: string;
    generationMeaning?: string;
  };
  personalTexture?: PersonalTexture;
};

export type FtuxGoalArcSurveyResponse = {
  version: 3;
  category: {
    key: FtuxCategoryKey;
    label: string;
    generationMeaning?: string;
    customText?: string;
  };
  concreteFocus: string;
  goalShape: {
    key: GoalShapeKey;
    label: string;
    generationMeaning?: string;
    customText?: string;
  };
  motivation: {
    key: FtuxMotivationKey;
    label: string;
    generationMeaning?: string;
    customText?: string;
  };
  identityBridge: {
    key: IdentityBridgeKey;
    label: string;
    generationMeaning?: string;
    customText?: string;
  };
  personalTexture?: PersonalTexture;
};

export type ArcSurveyResponse = ArcSurveyV1Response | ArcSurveyV2Response;

export type ArcGenerationInput = {
  surveyVersion: 1 | 2;
  prompt: string;
  additionalContext: string;
  surveyResponse: ArcSurveyResponse;
};

export type FtuxGoalDraft = {
  title: string;
  description: string;
  firstActivitySuggestion: string;
};

export type FtuxGoalArcGenerationInput = {
  surveyVersion: 3;
  prompt: string;
  additionalContext: string;
  surveyResponse: FtuxGoalArcSurveyResponse;
  goalDraft: FtuxGoalDraft;
};

export const ARC_CREATION_SURVEY_V1_STEP_ORDER: ArcCreationSurveyV1StepId[] = [
  'dreams',
  'whyNow',
  'domain',
  'proudMoment',
  'motivation',
  'roleModelType',
  'admiredQualities',
];

/**
 * Canonical per-Arc survey step order used in BOTH:
 * - FTUE first Arc creation
 * - Regular Arc creation
 *
 * NOTE: `whyNow` is intentionally included in the canonical order, but it is
 * treated as optional (skippable) by presenters.
 */
export const ARC_CREATION_SURVEY_STEP_ORDER: ArcCreationSurveyStepId[] = [
  'identityDirection',
  'primaryArena',
  'whyNow',
  'howThisShowsUpSeeds',
  'driftPatterns',
  'practiceStyle',
  'personalTexture',
];

export const FTUX_GOAL_ARC_SURVEY_STEP_ORDER: FtuxGoalArcSurveyStepId[] = [
  'category',
  'concreteFocus',
  'goalShape',
  'motivation',
  'identityBridge',
];

export const ARC_CREATION_SURVEY_COPY = {
  introTitleFirstArc: 'Create your first Arc',
  introTitleRegular: 'Create an Arc',
  introBodyFirstArc:
    'An Arc is one direction you want to grow — not your whole life plan. You can add more later.',
  introBodyRegular: 'Choose one direction you want to grow.',
  introCta: 'Start with one direction',
  identityDirectionTitle: 'What direction do you want to grow in first?',
  identityDirectionCustomPlaceholder: 'Describe the direction you want to grow in.',
  primaryArenaTitle: 'Where should this show up first?',
  primaryArenaCustomPlaceholder: 'Where should this show up first?',
  whyNowTitle: 'Why does this matter right now?',
  howThisShowsUpSeedsTitle: 'What would progress look like on an ordinary day?',
  howThisShowsUpSeedsCustomPlaceholder: 'What would progress look like?',
  driftPatternsTitle: 'What usually pulls you away?',
  driftPatternsCustomPlaceholder: 'What usually pulls you away?',
  practiceStyleTitle: 'What kind of support would help most?',
  personalTextureTitle: 'Want to add anything personal?',
  personalTextureHelper:
    'Optional. A detail here can help Kwilt make your Arc feel more like you.',
  personalTexturePlaceholder:
    'For example: “I want this to be about becoming a steadier dad, not just being more productive.”',
  skipWhyNowLabel: 'Skip',
  skipPersonalTextureLabel: 'Skip',
};

export const FTUX_GOAL_ARC_SURVEY_COPY = {
  introTitleFirstArc: 'Create your first Goal and Arc',
  introBodyFirstArc:
    'Start with one real thing you care about. Kwilt will turn it into a first Goal and the longer Arc it belongs inside.',
  introCta: 'Start with one thing',
  categoryTitle: 'What kind of thing is it?',
  categoryCustomPlaceholder: 'Describe the kind of thing.',
  concreteFocusTitle: 'Name it in a few words.',
  concreteFocusPlaceholder: 'Tennis, sleep, school, prayer...',
  goalShapeTitle: 'What do you want to do with it?',
  goalShapeCustomPlaceholder: 'Describe what you want to do with it.',
  motivationTitle: 'What matters most about it?',
  motivationCustomPlaceholder: 'Describe what matters most about it.',
  identityBridgeTitle: 'What kind of person do you want this to help you become?',
  identityBridgeCustomPlaceholder: 'Describe the kind of person this helps you become.',
};

export const FTUX_GOAL_ARC_SURVEY_VALIDATION = {
  category: { required: true, maxSelections: 1 },
  concreteFocus: { required: true, minLength: 2 },
  goalShape: { required: true, maxSelections: 1 },
  motivation: { required: true, maxSelections: 1 },
  identityBridge: { required: true, maxSelections: 1 },
  personalTexture: { required: false },
} as const;

export const ARC_CREATION_SURVEY_VALIDATION = {
  identityDirection: { required: true, maxSelections: 1 },
  primaryArena: { required: true, maxSelections: 1 },
  whyNow: { required: true, maxSelections: 1 },
  howThisShowsUpSeeds: { required: true, minSelections: 1, maxSelections: 3 },
  driftPatterns: { required: true, minSelections: 1, maxSelections: 2 },
  practiceStyle: { required: true, maxSelections: 1 },
  personalTexture: { required: false },
} as const;

export const identityDirectionOptions: Array<ArcSurveyOption<IdentityDirectionKey>> = [
  {
    id: 'steadiness',
    key: 'steadiness',
    label: 'Stay steady',
    generationMeaning:
      'The user wants more calm, presence, patience, and emotional steadiness.',
    relatedArcLanguage: ['steady', 'calm', 'present', 'patient', 'less reactive'],
  },
  {
    id: 'follow_through',
    key: 'follow_through',
    label: 'Finish what matters',
    generationMeaning:
      'The user wants more focus, consistency, completion, and follow-through.',
    relatedArcLanguage: ['finish', 'follow-through', 'focus', 'self-trust', 'completion'],
  },
  {
    id: 'vitality',
    key: 'vitality',
    label: 'Feel more alive',
    generationMeaning:
      'The user wants more energy, health, movement, recovery, adventure, and aliveness.',
    relatedArcLanguage: ['vitality', 'energy', 'health', 'movement', 'aliveness'],
  },
  {
    id: 'build_something_real',
    key: 'build_something_real',
    label: 'Build something real',
    generationMeaning:
      'The user wants to create, build, launch, express, or make something tangible.',
    relatedArcLanguage: ['build', 'create', 'ship', 'launch', 'make real'],
  },
  {
    id: 'capability',
    key: 'capability',
    label: 'Become more capable',
    generationMeaning:
      'The user wants more skill, competence, organization, usefulness, and confidence through practice.',
    relatedArcLanguage: ['capable', 'skilled', 'competent', 'useful', 'organized'],
  },
  {
    id: 'alignment',
    key: 'alignment',
    label: 'Live my values',
    generationMeaning:
      'The user wants life to better reflect their values, faith, purpose, integrity, or responsibilities.',
    relatedArcLanguage: ['values', 'integrity', 'meaning', 'purpose', 'faithfulness'],
  },
  {
    id: 'custom',
    key: 'custom',
    label: 'Something else',
    generationMeaning: 'The user wants to describe their own direction of becoming.',
    relatedArcLanguage: [],
    allowsCustomText: true,
  },
];

export const primaryArenaOptions: Array<ArcSurveyOption<PrimaryArenaKey>> = [
  { id: 'family', key: 'family', label: 'Family' },
  { id: 'health', key: 'health', label: 'Health' },
  { id: 'sports_movement', key: 'sports_movement', label: 'Sports / movement' },
  { id: 'work', key: 'work', label: 'Work' },
  { id: 'creative_work', key: 'creative_work', label: 'Creative work' },
  { id: 'faith_meaning', key: 'faith_meaning', label: 'Faith / meaning' },
  { id: 'money', key: 'money', label: 'Money' },
  { id: 'learning', key: 'learning', label: 'Learning' },
  { id: 'community', key: 'community', label: 'Community' },
  { id: 'home', key: 'home', label: 'Home' },
  { id: 'adventure', key: 'adventure', label: 'Adventure' },
  { id: 'custom', key: 'custom', label: 'Something else', allowsCustomText: true },
];

export const whyNowOptions: Array<ArcSurveyOption<WhyNowKey>> = [
  {
    id: 'enjoyment',
    key: 'enjoyment',
    label: 'I enjoy this',
    generationMeaning:
      'The user wants to give more time, attention, and structure to something they genuinely enjoy.',
  },
  {
    id: 'drifting',
    key: 'drifting',
    label: 'I’ve been drifting',
    generationMeaning:
      'The user wants more direction, intention, and a stronger sense of where life is headed.',
  },
  {
    id: 'new_season',
    key: 'new_season',
    label: 'A new season is starting',
    generationMeaning:
      'The user is entering a new life stage, responsibility, opportunity, or transition.',
  },
  {
    id: 'old_pattern',
    key: 'old_pattern',
    label: 'I’m tired of an old pattern',
    generationMeaning: 'The user recognizes a recurring pattern and wants to interrupt it.',
  },
  {
    id: 'responsibility',
    key: 'responsibility',
    label: 'People are counting on me',
    generationMeaning:
      'The user feels responsibility to family, work, community, or commitments.',
  },
  {
    id: 'creative_calling',
    key: 'creative_calling',
    label: 'I need to create this',
    generationMeaning:
      'The user feels called to bring an idea, project, product, or creative work into reality.',
  },
  {
    id: 'misaligned',
    key: 'misaligned',
    label: 'My life feels misaligned',
    generationMeaning:
      'The user feels a gap between what matters and how they are currently living.',
  },
  {
    id: 'self_trust',
    key: 'self_trust',
    label: 'I want to trust myself again',
    generationMeaning:
      'The user wants to rebuild confidence through repeated evidence of follow-through.',
  },
  {
    id: 'unsure',
    key: 'unsure',
    label: 'I’m not sure yet',
    generationMeaning:
      'The user feels the importance of change but cannot fully name why yet.',
  },
];

export const ftuxCategoryOptions: Array<ArcSurveyOption<FtuxCategoryKey>> = [
  {
    id: 'skill_hobby',
    key: 'skill_hobby',
    label: 'A skill or hobby',
    generationMeaning:
      'The user is starting from a skill, sport, hobby, craft, or personal interest.',
  },
  {
    id: 'project_creative',
    key: 'project_creative',
    label: 'A project or creative thing',
    generationMeaning:
      'The user is starting from a project, creative effort, build, launch, or tangible body of work.',
  },
  {
    id: 'health_energy',
    key: 'health_energy',
    label: 'Health or energy',
    generationMeaning:
      'The user is starting from health, energy, movement, sleep, recovery, or physical wellbeing.',
  },
  {
    id: 'school_work',
    key: 'school_work',
    label: 'School or work',
    generationMeaning:
      'The user is starting from school, work, career, responsibility, or performance expectations.',
  },
  {
    id: 'money_home',
    key: 'money_home',
    label: 'Money or home',
    generationMeaning:
      'The user is starting from finances, home life, organization, chores, or practical life administration.',
  },
  {
    id: 'relationships',
    key: 'relationships',
    label: 'Relationships',
    generationMeaning:
      'The user is starting from friendship, family, community, repair, connection, or care for others.',
  },
  {
    id: 'faith_values',
    key: 'faith_values',
    label: 'Faith or values',
    generationMeaning:
      'The user is starting from faith, meaning, values, service, integrity, or spiritual practice.',
  },
  {
    id: 'habit_change',
    key: 'habit_change',
    label: 'A habit I want to change',
    generationMeaning:
      'The user is starting from a pattern they want to interrupt, replace, or relate to differently.',
  },
  {
    id: 'custom',
    key: 'custom',
    label: 'Something else',
    generationMeaning: 'The user wants to describe their own category of focus.',
    allowsCustomText: true,
  },
];

export const goalShapeOptions: Array<ArcSurveyOption<GoalShapeKey>> = [
  {
    id: 'show_up_consistently',
    key: 'show_up_consistently',
    label: 'Do it more often',
    generationMeaning:
      'The first Goal should help the user repeat a meaningful practice over the next few weeks.',
  },
  {
    id: 'improve_one_part',
    key: 'improve_one_part',
    label: 'Get better at it',
    generationMeaning:
      'The first Goal should help the user improve at the focus; Kwilt can choose a small specific next step after the user gives the broad intent.',
  },
  {
    id: 'prepare_for_something',
    key: 'prepare_for_something',
    label: 'Get ready for something',
    generationMeaning:
      'The first Goal should help the user get ready for a known event, season, milestone, or opportunity.',
  },
  {
    id: 'confidence',
    key: 'confidence',
    label: 'Feel more confident',
    generationMeaning:
      'The first Goal should create evidence that the user can do this and keep going.',
  },
  {
    id: 'make_time',
    key: 'make_time',
    label: 'Make more time for it',
    generationMeaning:
      "The first Goal should create room in the user's real schedule for this focus.",
  },
  {
    id: 'get_organized',
    key: 'get_organized',
    label: 'Get organized',
    generationMeaning:
      'The first Goal should help the user bring order, clarity, or a simple system to this focus.',
  },
  {
    id: 'change_pattern',
    key: 'change_pattern',
    label: 'Work through something hard',
    generationMeaning:
      'The first Goal should help the user work through friction, repair, resistance, or a pattern that gets in the way.',
  },
  {
    id: 'finish_complete',
    key: 'finish_complete',
    label: 'Finish something',
    generationMeaning:
      'The first Goal should have a visible completion point, deliverable, shipped piece, or finished milestone.',
  },
  {
    id: 'custom',
    key: 'custom',
    label: 'Something else',
    generationMeaning: 'The user wants to describe their own concrete goal shape.',
    allowsCustomText: true,
  },
];

export const ftuxMotivationOptions: Array<ArcSurveyOption<FtuxMotivationKey>> = [
  {
    id: 'enjoyment',
    key: 'enjoyment',
    label: 'I enjoy it',
    generationMeaning:
      'This matters because the user genuinely enjoys it and wants to give it more structure.',
  },
  {
    id: 'improve',
    key: 'improve',
    label: 'I want to get better',
    generationMeaning:
      'This matters because the user wants improvement, skill, and a clearer path of practice.',
  },
  {
    id: 'energy',
    key: 'energy',
    label: 'It gives me energy',
    generationMeaning:
      'This matters because the focus gives the user vitality, momentum, or a stronger sense of aliveness.',
  },
  {
    id: 'life_works_better',
    key: 'life_works_better',
    label: 'It would make life better',
    generationMeaning:
      "This matters because the focus improves the user's daily life, stability, relationships, or sense of order.",
  },
  {
    id: 'people_i_care_about',
    key: 'people_i_care_about',
    label: 'It helps me care for or serve others',
    generationMeaning:
      'This matters because the focus connects to responsibility, care, or contribution to other people.',
  },
  {
    id: 'part_of_me',
    key: 'part_of_me',
    label: 'It connects to who I am',
    generationMeaning:
      'This matters because the focus expresses identity, values, belonging, or a long-running interest.',
  },
  {
    id: 'dont_want_to_lose',
    key: 'dont_want_to_lose',
    label: 'I do not want to lose it',
    generationMeaning:
      'This matters because the user wants to protect something meaningful from fading, drifting, or being crowded out.',
  },
  {
    id: 'custom',
    key: 'custom',
    label: 'Something else',
    generationMeaning: 'The user wants to describe their own motivation.',
    allowsCustomText: true,
  },
];

export const identityBridgeOptions: Array<ArcSurveyOption<IdentityBridgeKey>> = [
  {
    id: 'showing_up',
    key: 'showing_up',
    label: 'Someone who keeps showing up',
    generationMeaning:
      'The Arc should frame the user as becoming someone who shows up with consistency and care.',
  },
  {
    id: 'steady_when_hard',
    key: 'steady_when_hard',
    label: "Someone who stays steady when it's hard",
    generationMeaning:
      'The Arc should frame the user as becoming steadier under pressure, discomfort, or difficulty.',
  },
  {
    id: 'practice_growth',
    key: 'practice_growth',
    label: 'Someone who practices and improves',
    generationMeaning:
      'The Arc should frame the user as becoming someone who improves through repeated practice.',
  },
  {
    id: 'recover_setbacks',
    key: 'recover_setbacks',
    label: 'Someone who bounces back',
    generationMeaning:
      'The Arc should frame the user as becoming more resilient and able to return after mistakes or missed days.',
  },
  {
    id: 'responsibility',
    key: 'responsibility',
    label: 'Someone others can count on',
    generationMeaning:
      'The Arc should frame the user as becoming more responsible, dependable, and able to carry what matters.',
  },
  {
    id: 'present_with_people',
    key: 'present_with_people',
    label: 'Someone more present with people',
    generationMeaning:
      'The Arc should frame the user as becoming more present, attentive, and relationally available.',
  },
  {
    id: 'live_values',
    key: 'live_values',
    label: 'Someone who lives what matters',
    generationMeaning:
      'The Arc should frame the user as becoming someone whose actions match what they believe matters.',
  },
  {
    id: 'custom',
    key: 'custom',
    label: 'Something else',
    generationMeaning: 'The user wants to describe their own identity bridge.',
    allowsCustomText: true,
  },
];

export const resistanceOptions: Array<ArcSurveyOption<ResistanceKey>> = [
  {
    id: 'starting',
    key: 'starting',
    label: 'Starting',
    generationMeaning:
      'The first Goal should reduce startup friction and make the next action obvious.',
  },
  {
    id: 'sticking_with_it',
    key: 'sticking_with_it',
    label: 'Sticking with it',
    generationMeaning:
      'The first Goal should support consistency after the initial motivation fades.',
  },
  {
    id: 'distraction',
    key: 'distraction',
    label: 'Distraction',
    generationMeaning:
      'The first Goal should protect attention from devices, interruptions, or competing inputs.',
  },
  {
    id: 'discouragement',
    key: 'discouragement',
    label: 'Discouragement',
    generationMeaning:
      'The first Goal should make setbacks survivable and help the user keep going.',
  },
  {
    id: 'comparison',
    key: 'comparison',
    label: 'Comparing myself to others',
    generationMeaning:
      'The first Goal should focus the user on their own evidence of progress instead of comparison.',
  },
  {
    id: 'unclear_next_step',
    key: 'unclear_next_step',
    label: 'Not knowing the next step',
    generationMeaning:
      'The first Goal should define a clear next action and remove ambiguity.',
  },
  {
    id: 'tired_overloaded',
    key: 'tired_overloaded',
    label: 'Being tired or overloaded',
    generationMeaning:
      'The first Goal should fit the user’s available energy and avoid making the focus feel too heavy.',
  },
  {
    id: 'custom',
    key: 'custom',
    label: 'Something else',
    generationMeaning: 'The user wants to describe their own point of resistance.',
    allowsCustomText: true,
  },
];

const option = (key: string, label: string, generationMeaning: string): HowThisShowsUpOption => ({
  id: key,
  key,
  label,
  generationMeaning,
});

export const steadinessHowThisShowsUpOptions: HowThisShowsUpOption[] = [
  option('pause_before_reacting', 'Pause before reacting', 'The user wants progress to look like creating space before responding.'),
  option('listen_first', 'Listen first', 'The user wants progress to look like listening before defending, fixing, or reacting.'),
  option('create_calm', 'Create calm', 'The user wants progress to look like bringing calm into tense or ordinary moments.'),
  option('be_fully_present', 'Be fully present', 'The user wants progress to look like paying attention to the people and moments in front of them.'),
  option('recover_instead_of_numbing', 'Recover instead of numbing', 'The user wants progress to look like choosing real restoration over avoidance.'),
  option('make_space_peaceful', 'Make my space peaceful', 'The user wants progress to look like shaping their environment toward calm.'),
  option('respond_with_patience', 'Respond with patience', 'The user wants progress to look like patience under pressure.'),
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own ordinary-day behavior.', allowsCustomText: true },
];

export const followThroughHowThisShowsUpOptions: HowThisShowsUpOption[] = [
  option('keep_one_promise', 'Keep one promise', 'The user wants progress to look like keeping a concrete promise to themselves or someone else.'),
  option('close_one_loop', 'Close one loop', 'The user wants progress to look like finishing an open task or decision.'),
  option('take_next_step', 'Take the next step', 'The user wants progress to look like taking the next concrete action instead of waiting for clarity.'),
  option('finish_before_expanding', 'Finish before expanding', 'The user wants progress to look like completing the current scope before adding more.'),
  option('plan_before_reacting', 'Plan before reacting', 'The user wants progress to look like pausing to plan instead of acting from urgency.'),
  option('choose_harder_thing', 'Choose the harder thing', 'The user wants progress to look like choosing the meaningful hard action over the easier escape.'),
  option('protect_focus', 'Protect my focus', 'The user wants progress to look like guarding attention for what matters.'),
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own follow-through behavior.', allowsCustomText: true },
];

export const vitalityHowThisShowsUpOptions: HowThisShowsUpOption[] = [
  option('move_body', 'Move my body', 'The user wants progress to look like regular physical movement.'),
  option('get_outside', 'Get outside', 'The user wants progress to look like spending time outside and reconnecting with the world.'),
  option('sleep_like_it_matters', 'Sleep like it matters', 'The user wants progress to look like treating sleep as meaningful support.'),
  option('eat_with_care', 'Eat with care', 'The user wants progress to look like eating in a way that supports energy and attention.'),
  option('try_something_new', 'Try something new', 'The user wants progress to look like novelty, adventure, and trying new experiences.'),
  option('choose_energy_over_ease', 'Choose energy over ease', 'The user wants progress to look like choosing the thing that gives life, not just comfort.'),
  option('recover_well', 'Recover well', 'The user wants progress to look like intentional recovery instead of collapse.'),
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own vitality behavior.', allowsCustomText: true },
];

export const buildSomethingRealHowThisShowsUpOptions: HowThisShowsUpOption[] = [
  option('make_before_consuming', 'Make before consuming', 'The user wants progress to look like creating before consuming more inputs.'),
  option('share_before_perfect', 'Share before it’s perfect', 'The user wants progress to include sharing imperfect work with real people instead of waiting for polish.'),
  option('ask_for_feedback', 'Ask for feedback', 'The user wants progress to look like inviting real feedback.'),
  option('protect_build_time', 'Protect build time', 'The user wants progress to look like protecting time to make tangible progress.'),
  option('ship_small_piece', 'Ship a small piece', 'The user wants progress to look like releasing or completing a small visible piece.'),
  option('finish_before_expanding', 'Finish before expanding', 'The user wants progress to look like completing the current scope before adding more.'),
  option('let_it_be_imperfect', 'Let it be imperfect', 'The user wants progress to look like tolerating imperfection so the work can become real.'),
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own building behavior.', allowsCustomText: true },
];

export const capabilityHowThisShowsUpOptions: HowThisShowsUpOption[] = [
  option('practice_skill', 'Practice a skill', 'The user wants progress to look like deliberate skill practice.'),
  option('learn_by_doing', 'Learn by doing', 'The user wants progress to look like learning through real attempts.'),
  option('organize_tools', 'Organize my tools', 'The user wants progress to look like setting up tools and systems that make action easier.'),
  option('solve_real_problem', 'Solve one real problem', 'The user wants progress to look like applying skill to a concrete problem.'),
  option('ask_better_questions', 'Ask better questions', 'The user wants progress to look like improving understanding through better questions.'),
  option('finish_useful_task', 'Finish a useful task', 'The user wants progress to look like completing useful work.'),
  option('confidence_through_reps', 'Build confidence through reps', 'The user wants progress to look like confidence earned through repetition.'),
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own capability behavior.', allowsCustomText: true },
];

export const alignmentHowThisShowsUpOptions: HowThisShowsUpOption[] = [
  option('choose_what_matters', 'Choose what matters', 'The user wants progress to look like choosing based on values.'),
  option('say_no_clearly', 'Say no clearly', 'The user wants progress to look like protecting priorities with clear boundaries.'),
  option('make_time_for_meaning', 'Make time for meaning', 'The user wants progress to look like giving time to what matters most.'),
  option('act_with_integrity', 'Act with integrity', 'The user wants progress to look like matching actions to values.'),
  option('serve_someone', 'Serve someone', 'The user wants progress to look like concrete service.'),
  option('keep_quiet_commitment', 'Keep a quiet commitment', 'The user wants progress to look like private faithfulness to a commitment.'),
  option('return_to_grounds_me', 'Return to what grounds me', 'The user wants progress to look like returning to grounding practices or beliefs.'),
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own values-aligned behavior.', allowsCustomText: true },
];

export const generalHowThisShowsUpOptions: HowThisShowsUpOption[] = [
  option('intentional_step', 'Take one intentional step', 'The user wants progress to look like one deliberate action.'),
  option('keep_one_promise', 'Keep one promise', 'The user wants progress to look like keeping one meaningful promise.'),
  option('make_time_for_it', 'Make time for it', 'The user wants progress to look like making room for this Arc.'),
  option('choose_what_matters', 'Choose what matters', 'The user wants progress to look like choosing what matters over distraction.'),
  option('ask_for_help', 'Ask for help', 'The user wants progress to look like inviting support.'),
  option('practice_consistently', 'Practice consistently', 'The user wants progress to look like repeated practice.'),
  option('notice_progress', 'Notice progress', 'The user wants progress to look like noticing evidence of growth.'),
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own ordinary-day behavior.', allowsCustomText: true },
];

export function getHowThisShowsUpOptions(
  identityDirectionKey: IdentityDirectionKey | null | undefined
): HowThisShowsUpOption[] {
  switch (identityDirectionKey) {
    case 'steadiness':
      return steadinessHowThisShowsUpOptions;
    case 'follow_through':
      return followThroughHowThisShowsUpOptions;
    case 'vitality':
      return vitalityHowThisShowsUpOptions;
    case 'build_something_real':
      return buildSomethingRealHowThisShowsUpOptions;
    case 'capability':
      return capabilityHowThisShowsUpOptions;
    case 'alignment':
      return alignmentHowThisShowsUpOptions;
    case 'custom':
    default:
      return generalHowThisShowsUpOptions;
  }
}

export const driftPatternOptions: Array<ArcSurveyOption<DriftPatternKey>> = [
  { id: 'distraction', key: 'distraction', label: 'Distraction', generationMeaning: 'The user gets pulled away by scattered attention, devices, interruptions, or competing inputs.' },
  { id: 'exhaustion', key: 'exhaustion', label: 'Exhaustion', generationMeaning: 'The user runs out of energy before reaching what matters.' },
  { id: 'perfectionism', key: 'perfectionism', label: 'Perfectionism', generationMeaning: 'The user makes the work too heavy to begin, share, or finish.' },
  { id: 'fear_of_starting', key: 'fear_of_starting', label: 'Fear of starting', generationMeaning: 'The user avoids the first uncomfortable step.' },
  { id: 'too_many_ideas', key: 'too_many_ideas', label: 'Too many ideas', generationMeaning: 'The user scatters energy across too many promising paths before one compounds.' },
  { id: 'lack_of_structure', key: 'lack_of_structure', label: 'Lack of structure', generationMeaning: 'The user needs clearer rhythms, containers, plans, or routines.' },
  { id: 'saying_yes_too_much', key: 'saying_yes_too_much', label: 'Saying yes too much', generationMeaning: 'The user lets other priorities crowd out this Arc.' },
  { id: 'losing_momentum', key: 'losing_momentum', label: 'Losing momentum', generationMeaning: 'The user starts with energy but fades after a few days or weeks.' },
  { id: 'emotional_reactivity', key: 'emotional_reactivity', label: 'Emotional reactivity', generationMeaning: 'The user gets pulled off course by frustration, anxiety, resentment, or emotional spikes.' },
  { id: 'unclear_next_step', key: 'unclear_next_step', label: 'Unclear next step', generationMeaning: 'The user stalls because the path is ambiguous or the next action is not obvious.' },
  { id: 'custom', key: 'custom', label: 'Something else', generationMeaning: 'The user wants to describe their own drift pattern.', allowsCustomText: true },
];

export const practiceStyleOptions: Array<ArcSurveyOption<PracticeStyleKey>> = [
  { id: 'daily_rhythm', key: 'daily_rhythm', label: 'Daily rhythm', generationMeaning: 'The user wants a small repeated practice that happens most days.' },
  { id: 'weekly_ritual', key: 'weekly_ritual', label: 'Weekly ritual', generationMeaning: 'The user wants a recurring weekly block or rhythm to return to the Arc.' },
  { id: 'clear_project', key: 'clear_project', label: 'Clear project', generationMeaning: 'The user wants a concrete project with a visible finish line.' },
  { id: 'simple_checklist', key: 'simple_checklist', label: 'Simple checklist', generationMeaning: 'The user wants visible progress and simple repeatable steps.' },
  { id: 'habit_stack', key: 'habit_stack', label: 'Habit stack', generationMeaning: 'The user wants a small habit attached to something they already do.' },
  { id: 'reflection_prompt', key: 'reflection_prompt', label: 'Reflection prompt', generationMeaning: 'The user wants prompts that help them notice patterns and course-correct.' },
  { id: 'accountability', key: 'accountability', label: 'Accountability', generationMeaning: 'The user wants some form of check-in, commitment, or external accountability.' },
  { id: 'recommend', key: 'recommend', label: 'Recommend one', generationMeaning: 'The user wants Kwilt to choose the best support style based on previous answers.' },
];

export const personalTextureToneOptions: Array<ArcSurveyOption<PersonalTextureTonePreference>> = [
  { id: 'include_family', key: 'include_family', label: 'Include my family' },
  { id: 'include_faith', key: 'include_faith', label: 'Include my faith' },
  { id: 'include_creative_work', key: 'include_creative_work', label: 'Include my creative work' },
  { id: 'include_health', key: 'include_health', label: 'Include my health' },
  { id: 'more_practical', key: 'more_practical', label: 'Make it more practical' },
  { id: 'more_inspiring', key: 'more_inspiring', label: 'Make it more inspiring' },
  { id: 'gentler', key: 'gentler', label: 'Make it gentler' },
  { id: 'more_ambitious', key: 'more_ambitious', label: 'Make it more ambitious' },
];

export function isArcSurveyV2Response(response: unknown): response is ArcSurveyV2Response {
  return Boolean(response && typeof response === 'object' && (response as any).version === 2);
}

export function buildArcGenerationInputFromSurveyV2(response: ArcSurveyV2Response): ArcGenerationInput {
  const customDirection = response.identityDirection.customText?.trim();
  const customArena = response.primaryArena.customText?.trim();
  const directionLabel = customDirection || response.identityDirection.label;
  const arenaLabel = customArena || response.primaryArena.label;
  const prompt = `${directionLabel} in ${arenaLabel}`;
  const lines = [
    'Arc Survey v2 response (visible labels + hidden generation meanings):',
    JSON.stringify(response, null, 2),
    '',
    'Field mapping guidance:',
    '- identityDirection + primaryArena -> identity.statement',
    '- identityDirection + whyNow + primaryArena -> identity.whyItMatters',
    '- identityDirection + driftPatterns -> identity.centralInsight',
    '- howThisShowsUpSeeds -> howThisShowsUp',
    '- identityDirection + primaryArena + driftPatterns -> shape',
    '- practiceStyle + driftPatterns + primaryArena -> practice',
    '- driftPatterns -> whenThisGetsHard',
    '- personalTexture -> specificity, tone, and user-supplied language',
    '',
    'Tone preference guidance:',
    '- tonePreferences are optional flavor, not required content.',
    '- Use tonePreferences only when they naturally strengthen the Arc.',
    '- include_faith can signal grounding, meaning, or return; do not make theological claims or over-spiritualize the Arc.',
    '- include_creative_work should not become the main endpoint unless primaryArena or identityDirection is creative work.',
  ];

  return {
    surveyVersion: 2,
    prompt,
    additionalContext: lines.join('\n'),
    surveyResponse: response,
  };
}

export function buildArcGenerationInputFromSurveyV1(response: ArcSurveyV1Response): ArcGenerationInput {
  const dreams = Array.isArray(response.dreams)
    ? response.dreams.filter(Boolean).join('; ')
    : response.dreams ?? response.dream ?? '';
  const lines = [
    'Arc Survey v1 response (compatibility mode):',
    JSON.stringify(response, null, 2),
    '',
    'Approximate mapping guidance:',
    '- dreams -> identityDirection custom source + identity context',
    '- whyNow -> whyNow custom source',
    '- domain -> primaryArena',
    '- proudMoment -> howThisShowsUpSeeds custom source',
    '- motivation -> practiceStyle or centralInsight source material',
    '- roleModelType + admiredQualities -> personalTexture / tone / shape source material',
  ];

  return {
    surveyVersion: 1,
    prompt: dreams || response.domain || 'Create an Arc',
    additionalContext: lines.join('\n'),
    surveyResponse: { ...response, version: response.version ?? 1 },
  };
}

export function buildArcGenerationInputFromSurvey(response: ArcSurveyResponse): ArcGenerationInput {
  return isArcSurveyV2Response(response)
    ? buildArcGenerationInputFromSurveyV2(response)
    : buildArcGenerationInputFromSurveyV1(response);
}

const cleanGeneratedText = (text: string): string =>
  text
    .replace(/\\([.,!?;:])/g, '$1')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const cleanTerminalPunctuation = (text: string): string =>
  cleanGeneratedText(text).replace(/[.!?]+$/g, '').trim();

const cleanLabel = (label: string, customText?: string): string => {
  const custom = cleanGeneratedText(customText ?? '');
  return custom && custom.length > 0 ? custom : cleanGeneratedText(label);
};

function focusFromConcreteInput(input: string): string {
  const cleaned = cleanTerminalPunctuation(input);
  if (!cleaned) return cleaned;

  const patterns = [
    /^i\s+(?:want|wanna|would like|would love)\s+to\s+(?:get better at|improve at|improve in|improve|learn|practice|make progress on|work on)\s+(.+)$/i,
    /^i\s+(?:want|wanna|would like|would love)\s+to\s+be\s+better\s+at\s+(.+)$/i,
    /^to\s+(?:get better at|improve at|improve in|improve|learn|practice|make progress on|work on)\s+(.+)$/i,
    /^(?:get better at|improve at|improve in|learn|practice|make progress on|work on)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    const candidate = cleanTerminalPunctuation(match?.[1] ?? '');
    if (candidate) return candidate;
  }

  return cleaned;
};

function titleCaseFocus(focus: string): string {
  return cleanTerminalPunctuation(focus)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function goalVerbForShape(key: GoalShapeKey): string {
  switch (key) {
    case 'show_up_consistently':
      return 'Show up for';
    case 'improve_one_part':
      return 'Get better at';
    case 'prepare_for_something':
      return 'Prepare for';
    case 'make_time':
      return 'Make time for';
    case 'get_organized':
      return 'Get organized around';
    case 'finish_complete':
      return 'Finish something in';
    case 'confidence':
      return 'Build confidence in';
    case 'change_pattern':
      return 'Work through something hard in';
    case 'custom':
    default:
      return 'Make progress on';
  }
}

function firstActivityForShape(response: FtuxGoalArcSurveyResponse): string {
  const focus = focusFromConcreteInput(response.concreteFocus);
  switch (response.goalShape.key) {
    case 'show_up_consistently':
      return `Schedule one small ${focus} practice this week.`;
    case 'improve_one_part':
      return `Pick one part of ${focus} to practice for 10 minutes.`;
    case 'prepare_for_something':
      return `Name the next thing you are preparing for in ${focus}.`;
    case 'make_time':
      return `Choose one realistic time slot for ${focus}.`;
    case 'get_organized':
      return `Make one small list or setup step for ${focus}.`;
    case 'finish_complete':
      return `Define the smallest finish line for ${focus}.`;
    case 'confidence':
      return `Do one small rep of ${focus} and record what improved.`;
    case 'change_pattern':
      return `Name the hard part of ${focus} and one next move through it.`;
    case 'custom':
    default:
      return `Choose one small next step for ${focus}.`;
  }
}

export function buildFtuxGoalDraftFromSurvey(
  response: FtuxGoalArcSurveyResponse
): FtuxGoalDraft {
  const focus = focusFromConcreteInput(response.concreteFocus);
  const titleFocus = titleCaseFocus(focus);
  const category = cleanLabel(response.category.label, response.category.customText);
  const goalShape = cleanLabel(response.goalShape.label, response.goalShape.customText);
  const motivation = cleanLabel(response.motivation.label, response.motivation.customText);
  const identityBridge = cleanLabel(
    response.identityBridge.label,
    response.identityBridge.customText
  );

  return {
    title: `${goalVerbForShape(response.goalShape.key)} ${titleFocus}`,
    description: [
      `Make near-term progress on ${focus}.`,
      `Kind: ${category}.`,
      `Shape: ${goalShape}.`,
      `Why it matters: ${motivation}.`,
      `Longer Arc: ${identityBridge}.`,
    ].join(' '),
    firstActivitySuggestion: firstActivityForShape(response),
  };
}

export function buildFtuxGoalArcGenerationInput(
  response: FtuxGoalArcSurveyResponse
): FtuxGoalArcGenerationInput {
  const goalDraft = buildFtuxGoalDraftFromSurvey(response);
  const concreteFocus = focusFromConcreteInput(response.concreteFocus);
  const rawConcreteFocus = cleanGeneratedText(response.concreteFocus);
  const generationResponse: FtuxGoalArcSurveyResponse = {
    ...response,
    concreteFocus,
  };
  const identityBridge = cleanLabel(
    response.identityBridge.label,
    response.identityBridge.customText
  );
  const prompt = `${concreteFocus} toward ${identityBridge}`;
  const lines = [
    'FTUX Goal+Arc Survey v3 response (visible labels + hidden generation meanings):',
    JSON.stringify(generationResponse, null, 2),
    '',
    'Output contract:',
    '- Create one concrete first Goal and one identity-based Arc in the same onboarding outcome.',
    '- The Goal should be near-term, actionable, and directly based on concreteFocus + goalShape.',
    '- The Arc should name who the user is becoming through this focus, not merely repeat the activity.',
    '- The Arc can hold future Goals beyond this first one.',
    '- Use category, motivation, identityBridge, and personalTexture to tune language and support.',
    '- Do not require resistance or support-style detail before first value; those can be discovered later.',
    '- Keep language readable for teens and adults.',
    '- Treat interpretedFocus as the object being practiced. Use rawConcreteFocus only as extra user wording, not as a phrase to paste into names or sentences.',
    '',
    `Interpreted focus: ${concreteFocus}`,
    rawConcreteFocus !== concreteFocus ? `Raw user wording: ${rawConcreteFocus}` : null,
    '',
    'Deterministic Goal draft for persistence fallback:',
    JSON.stringify(goalDraft, null, 2),
  ].filter((line): line is string => Boolean(line));

  return {
    surveyVersion: 3,
    prompt,
    additionalContext: lines.join('\n'),
    surveyResponse: response,
    goalDraft,
  };
}

export function summarizeArcSurveyResponseForChat(response: ArcSurveyResponse): string {
  if (!isArcSurveyV2Response(response)) {
    const input = buildArcGenerationInputFromSurveyV1(response);
    return input.additionalContext;
  }

  const texture = response.personalTexture;
  return [
    `Direction: ${response.identityDirection.customText || response.identityDirection.label}`,
    `Arena: ${response.primaryArena.customText || response.primaryArena.label}`,
    `Why now: ${response.whyNow.label}`,
    `Ordinary-day progress: ${response.howThisShowsUpSeeds.map((item) => item.customText || item.label).join(', ')}`,
    `Drift: ${response.driftPatterns.map((item) => item.customText || item.label).join(', ')}`,
    `Support style: ${response.practiceStyle.label}`,
    texture?.freeText ? `Personal detail: ${texture.freeText}` : null,
    texture?.tonePreferences?.length ? `Tone preferences: ${texture.tonePreferences.join(', ')}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

export function summarizeFtuxGoalArcSurveyResponseForChat(
  response: FtuxGoalArcSurveyResponse
): string {
  const texture = response.personalTexture;
  return [
    `Focus: ${response.concreteFocus}`,
    `Kind: ${cleanLabel(response.category.label, response.category.customText)}`,
    `Goal shape: ${cleanLabel(response.goalShape.label, response.goalShape.customText)}`,
    `Meaning: ${cleanLabel(response.motivation.label, response.motivation.customText)}`,
    `Becoming: ${cleanLabel(response.identityBridge.label, response.identityBridge.customText)}`,
    texture?.freeText ? `Personal detail: ${texture.freeText}` : null,
    texture?.tonePreferences?.length ? `Tone preferences: ${texture.tonePreferences.join(', ')}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}
