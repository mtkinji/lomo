import {
  ARC_CREATION_SURVEY_STEP_ORDER,
  ARC_CREATION_SURVEY_VALIDATION,
  FTUX_GOAL_ARC_SURVEY_STEP_ORDER,
  FTUX_GOAL_ARC_SURVEY_VALIDATION,
  buildArcGenerationInputFromSurveyV2,
  buildFtuxGoalArcGenerationInput,
  buildFtuxGoalDraftFromSurvey,
  ftuxCategoryOptions,
  ftuxMotivationOptions,
  getHowThisShowsUpOptions,
  goalShapeOptions,
  identityBridgeOptions,
  identityDirectionOptions,
  primaryArenaOptions,
  type ArcSurveyV2Response,
  type FtuxGoalArcSurveyResponse,
  whyNowOptions,
} from '@kwilt/arc-survey';

describe('Arc Creation Survey v2', () => {
  it('uses the v2 canonical step order and keeps personal texture optional', () => {
    expect(ARC_CREATION_SURVEY_STEP_ORDER).toEqual([
      'identityDirection',
      'primaryArena',
      'whyNow',
      'howThisShowsUpSeeds',
      'driftPatterns',
      'practiceStyle',
      'personalTexture',
    ]);
    expect(ARC_CREATION_SURVEY_VALIDATION.personalTexture.required).toBe(false);
  });

  it('enforces the intended selection ranges in config', () => {
    expect(ARC_CREATION_SURVEY_VALIDATION.howThisShowsUpSeeds).toMatchObject({
      required: true,
      minSelections: 1,
      maxSelections: 3,
    });
    expect(ARC_CREATION_SURVEY_VALIDATION.driftPatterns).toMatchObject({
      required: true,
      minSelections: 1,
      maxSelections: 2,
    });
  });

  it('branches ordinary-day options by identity direction', () => {
    const buildOptions = getHowThisShowsUpOptions('build_something_real').map((option) => option.key);
    const steadyOptions = getHowThisShowsUpOptions('steadiness').map((option) => option.key);

    expect(buildOptions).toContain('share_before_perfect');
    expect(buildOptions).not.toContain('pause_before_reacting');
    expect(steadyOptions).toContain('pause_before_reacting');
  });

  it('includes youth-friendly sports and enjoyment choices for activity-driven Arcs', () => {
    expect(primaryArenaOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'sports_movement',
          label: 'Sports / movement',
        }),
      ])
    );
    expect(whyNowOptions[0]).toMatchObject({
      key: 'enjoyment',
      label: 'I enjoy this',
    });
    expect(whyNowOptions[0]?.generationMeaning).toContain('genuinely enjoy');
  });

  it('preserves hidden meanings and custom text in generation input', () => {
    const direction = identityDirectionOptions.find((option) => option.key === 'build_something_real');
    const response: ArcSurveyV2Response = {
      version: 2,
      identityDirection: {
        key: 'build_something_real',
        label: 'Build something real',
        generationMeaning: direction?.generationMeaning,
      },
      primaryArena: {
        key: 'creative_work',
        label: 'Creative work',
      },
      whyNow: {
        key: 'creative_calling',
        label: 'I need to create this',
        generationMeaning:
          'The user feels called to bring an idea, project, product, or creative work into reality.',
      },
      howThisShowsUpSeeds: [
        {
          key: 'share_before_perfect',
          label: 'Share before it’s perfect',
          generationMeaning:
            'The user wants progress to include sharing imperfect work with real people instead of waiting for polish.',
        },
      ],
      driftPatterns: [
        {
          key: 'too_many_ideas',
          label: 'Too many ideas',
          generationMeaning:
            'The user scatters energy across too many promising paths before one compounds.',
        },
      ],
      practiceStyle: {
        key: 'clear_project',
        label: 'Clear project',
        generationMeaning: 'The user wants a concrete project with a visible finish line.',
      },
      personalTexture: {
        freeText: 'Make this feel like creative courage, not productivity.',
        tonePreferences: ['more_practical'],
      },
    };

    const input = buildArcGenerationInputFromSurveyV2(response);

    expect(input.surveyVersion).toBe(2);
    expect(input.prompt).toBe('Build something real in Creative work');
    expect(input.additionalContext).toContain('Arc Survey v2 response');
    expect(input.additionalContext).toContain('sharing imperfect work');
    expect(input.additionalContext).toContain('creative courage');
  });
});

describe('FTUX Goal+Arc Survey v3', () => {
  const tennisResponse: FtuxGoalArcSurveyResponse = {
    version: 3,
    category: {
      key: 'skill_hobby',
      label: 'A skill or hobby',
      generationMeaning:
        'The user is starting from a skill, sport, hobby, craft, or personal interest.',
    },
    concreteFocus: 'Tennis',
    goalShape: {
      key: 'improve_one_part',
      label: 'Get better at it',
      generationMeaning:
        'The first Goal should help the user improve at the focus; Kwilt can choose a small specific next step after the user gives the broad intent.',
    },
    motivation: {
      key: 'enjoyment',
      label: 'I enjoy it',
      generationMeaning:
        'This matters because the user genuinely enjoys it and wants to give it more structure.',
    },
    identityBridge: {
      key: 'practice_growth',
      label: 'Someone who practices and improves',
      generationMeaning:
        'The Arc should frame the user as becoming someone who improves through repeated practice.',
    },
  };

  it('uses an activity-led step order that creates a Goal and an Arc together', () => {
    expect(FTUX_GOAL_ARC_SURVEY_STEP_ORDER).toEqual([
      'category',
      'concreteFocus',
      'goalShape',
      'motivation',
      'identityBridge',
    ]);
    expect(FTUX_GOAL_ARC_SURVEY_VALIDATION.category.required).toBe(true);
    expect(FTUX_GOAL_ARC_SURVEY_VALIDATION.concreteFocus.required).toBe(true);
    expect(FTUX_GOAL_ARC_SURVEY_VALIDATION.personalTexture.required).toBe(false);
  });

  it('keeps the deterministic options broad enough for concrete inputs', () => {
    expect(ftuxCategoryOptions.map((option) => option.key)).toEqual(
      expect.arrayContaining([
        'skill_hobby',
        'project_creative',
        'health_energy',
        'school_work',
        'money_home',
        'relationships',
        'faith_values',
        'habit_change',
        'custom',
      ])
    );
    expect(goalShapeOptions.map((option) => option.key)).toEqual(
      expect.arrayContaining([
        'show_up_consistently',
        'improve_one_part',
        'prepare_for_something',
        'make_time',
        'finish_complete',
        'get_organized',
        'confidence',
        'change_pattern',
        'custom',
      ])
    );
    expect(ftuxMotivationOptions.map((option) => option.key)).toEqual(
      expect.arrayContaining(['enjoyment', 'life_works_better', 'part_of_me', 'custom'])
    );
    expect(identityBridgeOptions.map((option) => option.key)).toEqual(
      expect.arrayContaining(['showing_up', 'practice_growth', 'recover_setbacks', 'custom'])
    );
  });

  it('turns a Charlie-like tennis input into a concrete Goal draft', () => {
    const draft = buildFtuxGoalDraftFromSurvey(tennisResponse);

    expect(draft.title).toBe('Get better at Tennis');
    expect(draft.description).toContain('Make near-term progress on Tennis.');
    expect(draft.description).toContain('Longer Arc: Someone who practices and improves.');
    expect(draft.firstActivitySuggestion).toBe('Pick one part of Tennis to practice for 10 minutes.');
  });

  it('normalizes sentence-style focus inputs before drafting the Goal', () => {
    const draft = buildFtuxGoalDraftFromSurvey({
      ...tennisResponse,
      concreteFocus: 'I want to get better at Tennis\\.',
    });

    expect(draft.title).toBe('Get better at Tennis');
    expect(draft.description).toContain('Make near-term progress on Tennis.');
    expect(draft.description).not.toContain('\\');
  });

  it('builds generation context that distinguishes the Goal from the identity Arc', () => {
    const input = buildFtuxGoalArcGenerationInput(tennisResponse);

    expect(input.surveyVersion).toBe(3);
    expect(input.prompt).toBe('Tennis toward Someone who practices and improves');
    expect(input.additionalContext).toContain('Create one concrete first Goal and one identity-based Arc');
    expect(input.additionalContext).toContain('not merely repeat the activity');
    expect(input.goalDraft.title).toBe('Get better at Tennis');
  });

  it('passes interpreted focus separately from raw wording to generation', () => {
    const input = buildFtuxGoalArcGenerationInput({
      ...tennisResponse,
      concreteFocus: 'I want to get better at Tennis\\.',
    });

    expect(input.prompt).toBe('Tennis toward Someone who practices and improves');
    expect(input.additionalContext).toContain('Interpreted focus: Tennis');
    expect(input.additionalContext).toContain('Raw user wording: I want to get better at Tennis.');
    expect(input.additionalContext).not.toContain('\\');
  });
});
