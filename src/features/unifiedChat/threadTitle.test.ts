import {
  buildCompressionMetadataMessages,
  buildOpeningTitleMessages,
  normalizeSuggestedThreadTitle,
  parseCompressionMetadataResponse,
  parseOpeningTitleResponse,
} from './threadTitle';

describe('Unified Chat intelligent titles', () => {
  test('normalizes specific short titles and rejects generic or unstable suggestions', () => {
    expect(normalizeSuggestedThreadTitle(' Planning the School Week ')).toBe('Planning the School Week');
    expect(normalizeSuggestedThreadTitle('New chat')).toBeNull();
    expect(normalizeSuggestedThreadTitle('Conversation about things')).toBeNull();
    expect(normalizeSuggestedThreadTitle('“Planning the School Week”')).toBeNull();
    expect(normalizeSuggestedThreadTitle('A title with far too many words to remain stable in the chat menu')).toBeNull();
  });

  test('builds a bounded opening-exchange naming request', () => {
    const messages = buildOpeningTitleMessages([
      { role: 'user', content: 'Can you help plan the school week?' },
      { role: 'assistant', content: 'Let’s start with the fixed commitments.' },
    ]);

    expect(messages[0]?.content).toContain('3–7 word title');
    expect(messages[0]?.content).toContain('Do not use sensitive details');
    expect(messages[1]?.content).toContain('plan the school week');
    expect(messages[1]?.content).toContain('fixed commitments');
    expect(parseOpeningTitleResponse('{"title":"Planning the School Week"}')).toBe(
      'Planning the School Week',
    );
  });

  test('parses one compressed understanding into both memory and a refined title', () => {
    const messages = buildCompressionMetadataMessages({
      existingSummary: '- The user is organizing family logistics.',
      newTurns: [{ role: 'user', content: 'The recurring issue is school pickup coverage.' }],
    });

    expect(messages[0]?.content).toContain('durable memory summary');
    expect(messages[0]?.content).toContain('3–7 word title');
    expect(messages[1]?.content).toContain('school pickup coverage');
    expect(parseCompressionMetadataResponse(JSON.stringify({
      title: 'School Pickup Coverage Plan',
      summary: '- The user is arranging reliable school pickup coverage.',
    }))).toEqual({
      title: 'School Pickup Coverage Plan',
      summary: '- The user is arranging reliable school pickup coverage.',
    });
    expect(parseCompressionMetadataResponse('{"title":"Chat","summary":"- Useful"}')).toBeNull();
  });
});

