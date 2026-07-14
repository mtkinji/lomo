import { buildChapterOpenAiRequestBody } from '../chapterOpenAiRequest.ts';

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test('chapterOpenAiRequest builds the chat completion JSON contract', () => {
  const body = buildChapterOpenAiRequestBody({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: '{"task":"generate"}' },
    ],
    template: { kind: 'reflection', detailLevel: 'medium', tone: 'gentle' },
    periodDays: 7,
  });

  assertEquals(body.model, 'gpt-4o');
  assertEquals(body.messages.length, 2);
  assertEquals(body.max_tokens, 1200);
  assertEquals(body.temperature, 0.65);
  assertEquals(body.response_format.type, 'json_object');
});

Deno.test('chapterOpenAiRequest applies detail, kind, period, and retry policies', () => {
  const longPeriod = buildChapterOpenAiRequestBody({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Prompt' }],
    template: { kind: 'report', detailLevel: 'short', tone: 'direct' },
    periodDays: 200,
    stricter: true,
  });
  const deepPlayful = buildChapterOpenAiRequestBody({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Prompt' }],
    template: { kind: 'reflection', detailLevel: 'deep', tone: 'playful' },
    periodDays: 30,
  });

  assertEquals(longPeriod.max_tokens, 1900);
  assertEquals(longPeriod.temperature, 0.2);
  assertEquals(deepPlayful.max_tokens, 1600);
  assert(deepPlayful.temperature > longPeriod.temperature, 'playful reflection should stay warmer than strict report retry');
});
