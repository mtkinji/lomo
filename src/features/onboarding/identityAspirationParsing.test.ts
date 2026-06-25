import {
  containsArcMushPhrases,
  isHarshOrClinicalInsightSet,
  parseAspirationFromReply,
  parseInsightsFromReply,
  parseQualityScoreFromReply,
  sanitizeArcName,
  splitAspirationNarrative,
} from './identityAspirationParsing';

describe('identity aspiration parsing', () => {
  it('splits the three-sentence narrative without breaking on abbreviations or decimals', () => {
    expect(
      splitAspirationNarrative(
        'You are becoming a steady maker beside Dr. Lee. The prototype can reach version 2.0 without panic. Daily progress looks like one honest work block.'
      ),
    ).toEqual({
      identity: 'You are becoming a steady maker beside Dr. Lee.',
      why: 'The prototype can reach version 2.0 without panic.',
      daily: 'Daily progress looks like one honest work block.',
    });
  });

  it('sanitizes model-generated Arc names into compact identity labels', () => {
    expect(sanitizeArcName('I want to become a disciplined product builder')).toBe(
      'Become Disciplined Product Builder',
    );
    expect(sanitizeArcName('')).toBe('The Steady Self');
  });

  it('parses strict and legacy JSON aspiration replies', () => {
    expect(
      parseAspirationFromReply('prefix {"name":"Venture Stewardship","narrative":"You are becoming focused.","nextSmallStep":"Send one note."} suffix', {
        fallbackNextSmallStep: 'Fallback step.',
      }),
    ).toEqual({
      arcName: 'Venture Stewardship',
      aspirationSentence: 'You are becoming focused.',
      nextSmallStep: 'Send one note.',
    });

    expect(
      parseAspirationFromReply('{"arcName":"The Honest Builder","aspirationSentence":"Build with care."}', {
        fallbackNextSmallStep: 'Fallback step.',
      }),
    ).toEqual({
      arcName: 'The Honest Builder',
      aspirationSentence: 'Build with care.',
      nextSmallStep: 'Fallback step.',
    });
  });

  it('falls back to markdown-style aspiration replies', () => {
    expect(
      parseAspirationFromReply(
        '**Arc Name:** "The Empathetic Creator"\n\nYou are becoming someone who makes meaningful things with care.',
        { fallbackNextSmallStep: 'Reach out once.' },
      ),
    ).toEqual({
      arcName: 'The Empathetic Creator',
      aspirationSentence: 'You are becoming someone who makes meaningful things with care.',
      nextSmallStep: 'Reach out once.',
    });
  });

  it('parses and normalizes Arc development insight JSON', () => {
    expect(
      parseInsightsFromReply(`Here is the profile:
{
  "strengths": ["- Returning to craft", "2. Making room for practice"],
  "growthEdges": ["* Letting progress be small", "Noticing what drains focus"],
  "pitfalls": ["Remembering this is practice", "Letting one person in"]
}`),
    ).toEqual({
      strengths: ['Returning to craft', 'Making room for practice'],
      growthEdges: ['Letting progress be small', 'Noticing what drains focus'],
      pitfalls: ['Remembering this is practice', 'Letting one person in'],
    });
  });

  it('rejects weak insight payloads and harsh phrasing', () => {
    expect(
      parseInsightsFromReply(
        '{"strengths":["one"],"growthEdges":["two","three"],"pitfalls":["four","five"]}',
      ),
    ).toBeNull();

    expect(
      isHarshOrClinicalInsightSet({
        strengths: ['Returning to craft'],
        growthEdges: ['People struggle with perfectionism'],
        pitfalls: ['Letting progress stay repeatable'],
      }),
    ).toBe(true);
  });

  it('detects banned Arc mush phrases', () => {
    expect(containsArcMushPhrases('A path rooted in your radiant essence.')).toBe(true);
    expect(containsArcMushPhrases('A practical direction for ordinary days.')).toBe(false);
  });

  it('parses quality judge scores from strict or wrapped JSON', () => {
    expect(
      parseQualityScoreFromReply(
        'The score is {"total_score": 8.25, "reasoning": " Strong fit. "} today.',
      ),
    ).toEqual({
      score: 8.25,
      reasoning: 'Strong fit.',
    });

    expect(parseQualityScoreFromReply('{"totalScore": 7}')).toEqual({
      score: 7,
    });
  });

  it('rejects malformed quality judge scores', () => {
    expect(parseQualityScoreFromReply('not json')).toBeNull();
    expect(parseQualityScoreFromReply('{"reasoning":"missing score"}')).toBeNull();
    expect(parseQualityScoreFromReply('{"total_score":"9"}')).toBeNull();
  });
});
