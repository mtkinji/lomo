import {
  allowedUnanchoredStoryParagraphs,
  buildValidationRepairInstruction,
  countQuotedTitles,
  findMismatchedCompletionCount,
  paragraphHasAnchor,
  resolveCitedExampleRequirement,
  resolveQuotedTitleRequirement,
  shouldRequireVerbatimUserNote,
  stripGroundedTextForHealthScan,
  splitParagraphs,
} from '../chapterOutputValidation';
import { containsHealthKeyword } from '../chapterHealth';

describe('resolveQuotedTitleRequirement', () => {
  it('keeps weekly chapters grounded without requiring a long-form quote count', () => {
    expect(
      resolveQuotedTitleRequirement({
        cadence: 'weekly',
        strict: true,
        quoteableActivityTitleCount: 20,
      }),
    ).toBe(1);
  });

  it('keeps monthly strict retries at the long-form threshold', () => {
    expect(
      resolveQuotedTitleRequirement({
        cadence: 'monthly',
        strict: true,
        quoteableActivityTitleCount: 20,
      }),
    ).toBe(5);
  });

  it('does not require more quoted titles than the evidence can supply', () => {
    expect(
      resolveQuotedTitleRequirement({
        cadence: 'yearly',
        strict: true,
        quoteableActivityTitleCount: 3,
      }),
    ).toBe(3);
  });
});

describe('resolveCitedExampleRequirement', () => {
  it('does not raise weekly strict retries to a long-form citation count', () => {
    expect(resolveCitedExampleRequirement({ cadence: 'weekly', strict: true })).toBe(2);
  });

  it('keeps monthly strict retries at the richer evidence count', () => {
    expect(resolveCitedExampleRequirement({ cadence: 'monthly', strict: true })).toBe(6);
  });

  it('does not require more citations than the evidence can supply', () => {
    expect(
      resolveCitedExampleRequirement({
        cadence: 'weekly',
        strict: true,
        availableExampleCount: 2,
      }),
    ).toBe(2);
  });

  it('allows zero citations when a quiet period has no activity evidence', () => {
    expect(
      resolveCitedExampleRequirement({
        cadence: 'weekly',
        strict: true,
        availableExampleCount: 0,
      }),
    ).toBe(0);
  });
});

describe('buildValidationRepairInstruction', () => {
  it('turns missing health metrics failures into a concrete health-language ban', () => {
    const instruction = buildValidationRepairInstruction(
      'story.body mentions health/sleep/movement/mindfulness but metrics.health is not attached — the generator has no evidence to support that claim',
    );

    expect(instruction).toContain('Do not mention sleep, steps, walking, workouts, mindfulness, meditation, or active minutes');
    expect(instruction).toContain('metrics.health is absent');
  });

  it('turns caption number failures into a concrete caption repair', () => {
    const instruction = buildValidationRepairInstruction(
      'sections.signal.caption must include at least one number from metrics',
    );

    expect(instruction).toContain('sections.signal.caption');
    expect(instruction).toContain('include at least one exact number from metrics');
  });

  it('keeps the original validator error visible for unclassified failures', () => {
    expect(buildValidationRepairInstruction('Output missing title')).toContain('Output missing title');
  });

  it('turns invalid JSON failures into a compact complete-json repair', () => {
    const instruction = buildValidationRepairInstruction('OpenAI returned invalid JSON output');

    expect(instruction).toContain('Return one complete valid JSON object');
    expect(instruction).toContain('shorter story.body');
  });
});

describe('allowedUnanchoredStoryParagraphs', () => {
  it('allows one interpretive paragraph in weekly chapters', () => {
    expect(allowedUnanchoredStoryParagraphs('weekly')).toBe(1);
  });

  it('keeps long-form chapters fully anchored paragraph by paragraph', () => {
    expect(allowedUnanchoredStoryParagraphs('monthly')).toBe(0);
  });
});

describe('shouldRequireVerbatimUserNote', () => {
  it('treats weekly notes as prompt guidance instead of a hard generation blocker', () => {
    expect(shouldRequireVerbatimUserNote('weekly')).toBe(false);
  });

  it('keeps long-form chapters under the stricter user-note citation rule', () => {
    expect(shouldRequireVerbatimUserNote('monthly')).toBe(true);
    expect(shouldRequireVerbatimUserNote('yearly')).toBe(true);
  });
});

describe('findMismatchedCompletionCount', () => {
  it('flags completion prose that uses a non-completed activity count', () => {
    expect(
      findMismatchedCompletionCount(
        'Over seven active days, 12 activities were completed.',
        11,
      ),
    ).toBe(12);
  });

  it('allows completion prose that matches the deterministic count', () => {
    expect(
      findMismatchedCompletionCount(
        'Across the week, you completed 11 activities while creating 12.',
        11,
      ),
    ).toBeNull();
  });
});

describe('stripGroundedTextForHealthScan', () => {
  it('removes quoted activity titles before health-keyword scanning', () => {
    const stripped = stripGroundedTextForHealthScan({
      text: 'You finished "Morning walk" and stayed with the Family Arc.',
      activityTitles: ['Morning walk'],
      arcTitles: ['Family Arc'],
      goalTitles: [],
    });

    expect(containsHealthKeyword(stripped)).toBe(false);
  });

  it('removes exact Arc and Goal titles before health-keyword scanning', () => {
    const stripped = stripGroundedTextForHealthScan({
      text: 'Sleep Reset moved because the Workout Basics goal had 2 concrete to-dos.',
      activityTitles: [],
      arcTitles: ['Sleep Reset'],
      goalTitles: ['Workout Basics'],
    });

    expect(containsHealthKeyword(stripped)).toBe(false);
    expect(stripped).toContain('2 concrete to-dos');
  });
});

describe('chapter output text helpers', () => {
  it('splits story bodies into non-empty paragraphs', () => {
    expect(splitParagraphs('One.\n\n\nTwo.\n\nThree.')).toEqual(['One.', 'Two.', 'Three.']);
  });

  it('detects paragraph anchors from numbers, quoted activities, arcs, and goals', () => {
    const params = {
      arcTitles: ['Family Arc'],
      goalTitles: ['Kitchen Reset'],
      activityTitles: ['Book plumber'],
    };

    expect(paragraphHasAnchor({ paragraph: 'You closed 4 things.', ...params })).toBe(true);
    expect(paragraphHasAnchor({ paragraph: 'The Family Arc carried the week.', ...params })).toBe(true);
    expect(paragraphHasAnchor({ paragraph: 'Kitchen Reset finally moved.', ...params })).toBe(true);
    expect(paragraphHasAnchor({ paragraph: 'You finished "Book plumber" on Friday.', ...params })).toBe(true);
    expect(paragraphHasAnchor({ paragraph: 'The week had a quieter shape.', ...params })).toBe(false);
  });

  it('counts straight and smart quoted activity titles verbatim', () => {
    expect(
      countQuotedTitles(
        'You finished "Book plumber" and then \u201COrder filters\u201D.',
        ['Book plumber', 'Order filters', 'Unquoted title'],
      ),
    ).toBe(2);
  });
});
