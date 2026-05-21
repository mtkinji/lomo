import { resolveQuotedTitleRequirement } from '../chapterOutputValidation';

describe('resolveQuotedTitleRequirement', () => {
  it('keeps weekly chapters grounded without requiring a long-form quote count', () => {
    expect(
      resolveQuotedTitleRequirement({
        cadence: 'weekly',
        strict: true,
        quoteableActivityTitleCount: 20,
      }),
    ).toBe(2);
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
