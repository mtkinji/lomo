export type ArcCreationSurveyStepId =
  | 'dreams'
  | 'whyNow'
  | 'domain'
  | 'proudMoment'
  | 'motivation'
  | 'roleModelType'
  | 'admiredQualities';

/**
 * Canonical per-Arc survey step order used in BOTH:
 * - FTUE first Arc creation
 * - Regular Arc creation
 *
 * NOTE: `whyNow` is intentionally included in the canonical order, but it is
 * treated as optional (skippable) by presenters.
 */
export const ARC_CREATION_SURVEY_STEP_ORDER: ArcCreationSurveyStepId[] = [
  'dreams',
  'whyNow',
  'domain',
  'proudMoment',
  'motivation',
  'roleModelType',
  'admiredQualities',
];

export const ARC_CREATION_SURVEY_COPY = {
  dreamsTitle: 'Looking ahead, what’s one big thing you’d love to bring to life?',
  dreamsPlaceholder:
    'e.g., Be a calmer, more patient dad; build a lifestyle software business; rewild our back acreage into a native meadow.',
  whyNowTitle: 'Why does this feel important to you right now? (Optional)',
  domainTitle: 'Which part of yourself are you most excited to grow right now?',
  proudMomentTitle:
    'On a normal day in that future—not a big moment—what could you do that would make you feel quietly proud of yourself?',
  motivationTitle: 'What do you think would motivate future you the most here?',
  roleModelTypeTitle: 'What kind of people do you look up to?',
  admiredQualitiesTitle: 'What qualities do you admire in them? (Pick 1–3)',
  skipWhyNowLabel: 'Skip',
};


