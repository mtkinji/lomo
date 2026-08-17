import {
  buildCompressionMetadataMessages,
  buildOnDeviceThreadTitlePrompt,
  buildOpeningTitleMessages,
  normalizeSuggestedThreadTitle,
  parseCompressionMetadataResponse,
  parseOpeningTitleResponse,
  resolveOpeningThreadTitle,
} from './threadTitle';

describe('Unified Chat intelligent titles', () => {
  test('normalizes specific short titles and rejects generic or unstable suggestions', () => {
    expect(normalizeSuggestedThreadTitle(' Planning the School Week ')).toBe('Planning the School Week');
    expect(normalizeSuggestedThreadTitle('Title: Efficient Saturday Routine')).toBe(
      'Efficient Saturday Routine',
    );
    expect(normalizeSuggestedThreadTitle("Prioritizing Tomorrow's Tasks and Schedule")).toBeNull();
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

    expect(messages[0]?.content).toContain('3–6 word title under 36 characters');
    expect(messages[0]?.content).toContain('Do not use sensitive details');
    expect(messages[1]?.content).toContain('plan the school week');
    expect(messages[1]?.content).toContain('fixed commitments');
    expect(parseOpeningTitleResponse('{"title":"Planning the School Week"}')).toBe(
      'Planning the School Week',
    );
  });

  test('builds a bounded plain-text prompt for the on-device title job', () => {
    const prompt = buildOnDeviceThreadTitlePrompt([
      { role: 'system', content: 'private system instruction' },
      { role: 'user', content: `Help plan school pickup ${'x'.repeat(3_000)}` },
      { role: 'assistant', content: 'Let’s identify the fixed commitments.' },
    ]);

    expect(prompt).toContain('User: Help plan school pickup');
    expect(prompt).not.toContain('private system instruction');
    expect(prompt.length).toBeLessThanOrEqual(2_400);
  });

  test('prefers a valid local title and falls back once for invalid or failed local output', async () => {
    const cloud = jest.fn(async () => 'School Pickup Coverage');
    await expect(resolveOpeningThreadTitle({
      generateLocal: async () => 'Planning the School Week',
      generateCloud: cloud,
    })).resolves.toBe('Planning the School Week');
    expect(cloud).not.toHaveBeenCalled();

    await expect(resolveOpeningThreadTitle({
      generateLocal: async () => 'Chat',
      generateCloud: cloud,
    })).resolves.toBe('School Pickup Coverage');
    await expect(resolveOpeningThreadTitle({
      generateLocal: async () => { throw new Error('local unavailable'); },
      generateCloud: cloud,
    })).resolves.toBe('School Pickup Coverage');
    expect(cloud).toHaveBeenCalledTimes(2);
  });

  test('parses one compressed understanding into both memory and a refined title', () => {
    const messages = buildCompressionMetadataMessages({
      existingSummary: '- The user is organizing family logistics.',
      newTurns: [{ role: 'user', content: 'The recurring issue is school pickup coverage.' }],
    });

    expect(messages[0]?.content).toContain('durable memory summary');
    expect(messages[0]?.content).toContain('3–6 word title under 36 characters');
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
