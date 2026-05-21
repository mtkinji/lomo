import {
  allowedUnanchoredStoryParagraphs,
  findMismatchedCompletionCount,
  resolveQuotedTitleRequirement,
  shouldRequireVerbatimUserNote,
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
