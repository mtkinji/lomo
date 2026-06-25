import {
  allowedUnanchoredStoryParagraphs,
  countQuotedTitles,
  findMismatchedCompletionCount,
  paragraphHasAnchor,
  resolveCitedExampleRequirement,
  resolveQuotedTitleRequirement,
  shouldRequireVerbatimUserNote,
  splitParagraphs,
} from '../chapterOutputValidation';

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
    expect(resolveCitedExampleRequirement({ cadence: 'weekly', strict: true })).toBe(4);
  });

  it('keeps monthly strict retries at the richer evidence count', () => {
    expect(resolveCitedExampleRequirement({ cadence: 'monthly', strict: true })).toBe(6);
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
