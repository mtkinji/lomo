export type IdentityTag =
  | 'creative'
  | 'expression'
  | 'mastery'
  | 'making'
  | 'strength'
  | 'courage'
  | 'excellence'
  | 'leadership'
  | 'relationships'
  | 'helping'
  | 'meaning'
  | 'values'
  | 'discipline'
  | 'exploration'
  | 'reliability'
  | 'loyalty'
  | 'competitiveness'
  | 'humor'
  | 'calm'
  | 'intensity'
  | 'empathy'
  | 'consistency'
  | 'self_belief'
  | 'starting'
  | 'speaking_up'
  | 'finishing'
  | 'emotion_regulation'
  | 'patience'
  | 'focus'
  | 'showing_up'
  | 'making_meaningful'
  | 'new_thinking'
  | 'honesty_bravery'
  | 'skill_improvement'
  | 'friend_support'
  | 'problem_solving'
  | 'curiosity';

export type ChoiceOption = {
  id: string;
  label: string;
  tags?: IdentityTag[];
  emoji?: string;
};

// Q1 – Domain of becoming (the arena)
export const DOMAIN_OPTIONS: ChoiceOption[] = [
  {
    id: 'creativity_expression',
    label: 'Creativity & expression',
    emoji: '🎨',
    tags: ['creative', 'expression', 'mastery'],
  },
  {
    id: 'craft_skill_building',
    label: 'Craft, skill & building',
    emoji: '🛠️',
    tags: ['mastery', 'making', 'strength'],
  },
  {
    id: 'leadership_influence',
    label: 'Leadership & influence',
    emoji: '🌟',
    tags: ['leadership', 'relationships'],
  },
  {
    id: 'relationships_connection',
    label: 'Relationships & connection',
    emoji: '🤝',
    tags: ['relationships', 'helping'],
  },
  {
    id: 'purpose_meaning_contribution',
    label: 'Purpose, meaning & contribution',
    emoji: '🌱',
    tags: ['meaning', 'values', 'helping', 'making_meaningful'],
  },
  {
    id: 'courage_confidence',
    label: 'Courage & confidence',
    emoji: '💪',
    tags: ['courage', 'self_belief'],
  },
  {
    id: 'habits_discipline_energy',
    label: 'Habits, discipline & energy',
    emoji: '📅',
    tags: ['discipline', 'consistency', 'strength'],
  },
  {
    id: 'adventure_exploration',
    label: 'Adventure & exploration',
    emoji: '🧭',
    tags: ['exploration', 'courage'],
  },
  {
    id: 'inner_life_mindset',
    label: 'Inner life & mindset',
    emoji: '🧘',
    tags: ['calm', 'emotion_regulation', 'meaning'],
  },
];

// Q2 – Motivational style (their drive)
export const MOTIVATION_OPTIONS: ChoiceOption[] = [
  {
    id: 'make_new_things',
    label: 'Making things that didn’t exist before',
    tags: ['creative', 'making', 'mastery'],
  },
  {
    id: 'reliable_for_others',
    label: 'Being someone others can rely on',
    tags: ['reliability', 'relationships', 'helping'],
  },
  {
    id: 'excellence_through_effort',
    label: 'Achieving excellence through effort',
    tags: ['excellence', 'discipline', 'mastery'],
  },
  {
    id: 'solve_hard_problems',
    label: 'Figuring out problems others can’t',
    tags: ['problem_solving', 'mastery'],
  },
  {
    id: 'help_people_feel_valued',
    label: 'Helping people feel valued',
    tags: ['helping', 'relationships', 'values'],
  },
  {
    id: 'express_ideas_new_way',
    label: 'Expressing ideas in a new way',
    tags: ['expression', 'creative', 'new_thinking'],
  },
  {
    id: 'become_stronger',
    label: 'Becoming stronger—mentally or physically',
    tags: ['strength', 'mastery', 'courage'],
  },
  {
    id: 'stand_up_for_what_matters',
    label: 'Standing up for what matters',
    tags: ['values', 'courage'],
  },
];

// Q3 – Everyday proud moment (embodiment)
export const PROUD_MOMENT_OPTIONS: ChoiceOption[] = [
  {
    id: 'showing_up_when_hard',
    label: 'Showing up even when it’s hard',
    tags: ['showing_up', 'consistency', 'courage'],
  },
  {
    id: 'making_something_meaningful',
    label: 'Making something meaningful',
    tags: ['making_meaningful', 'creative', 'making'],
  },
  { id: 'helping_someone', label: 'Helping someone', tags: ['helping', 'relationships'] },
  { id: 'pushing_yourself', label: 'Pushing yourself', tags: ['courage', 'strength'] },
  { id: 'thinking_in_new_way', label: 'Thinking in a new way', tags: ['new_thinking', 'exploration'] },
  { id: 'being_honest_or_brave', label: 'Being honest or brave', tags: ['honesty_bravery', 'values', 'courage'] },
  { id: 'improving_a_skill', label: 'Improving a skill', tags: ['skill_improvement', 'mastery'] },
  { id: 'supporting_a_friend', label: 'Supporting a friend', tags: ['friend_support', 'relationships', 'helping'] },
  {
    id: 'caring_for_energy',
    label: 'Taking care of your body & energy',
    tags: ['calm', 'discipline', 'strength'],
  },
];

// Optional – "Why now" / turning point for the identity Arc.
export const WHY_NOW_OPTIONS: ChoiceOption[] = [
  {
    id: 'excited_and_serious',
    label: "I’m excited about this and want to take it seriously.",
    tags: ['making_meaningful', 'mastery'],
  },
  {
    id: 'fits_future_me',
    label: "It fits who I’m trying to become.",
    tags: ['values', 'meaning'],
  },
  {
    id: 'keeps_returning',
    label: 'It keeps coming back to me.',
    tags: ['new_thinking', 'exploration'],
  },
  {
    id: 'change_for_good',
    label: 'It would really change things in a good way.',
    tags: ['making_meaningful'],
  },
  {
    id: 'bigger_than_me',
    label: 'It’s about more than just me.',
    tags: ['meaning', 'values', 'making_meaningful'],
  },
];



