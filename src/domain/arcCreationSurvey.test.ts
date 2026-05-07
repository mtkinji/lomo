import {
  ARC_CREATION_SURVEY_STEP_ORDER,
  ARC_CREATION_SURVEY_VALIDATION,
  buildArcGenerationInputFromSurveyV2,
  getHowThisShowsUpOptions,
  identityDirectionOptions,
  type ArcSurveyV2Response,
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
