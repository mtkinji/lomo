import { createChatCompletionStreamAccumulator } from '../aiChatCompletionStream';

const encoder = new TextEncoder();

describe('createChatCompletionStreamAccumulator', () => {
  test('parses text and usage across arbitrary UTF-8 and event boundaries', () => {
    const accumulator = createChatCompletionStreamAccumulator();
    const payload = [
      'data: {"choices":[{"delta":{"content":"Hello 🌎"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":4,"completion_tokens":2,"total_tokens":6}}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    const bytes = encoder.encode(payload);
    const splitAt = payload.indexOf('🌎') + 1;

    const first = accumulator.push(bytes.slice(0, splitAt));
    const second = accumulator.push(bytes.slice(splitAt, bytes.length - 5));
    const final = accumulator.push(bytes.slice(bytes.length - 5));

    expect([...first.textDeltas, ...second.textDeltas, ...final.textDeltas]).toEqual(['Hello 🌎', '!']);
    expect(final.usage).toEqual({ prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 });
    expect(accumulator.finish()).toEqual({ textDeltas: [], usage: final.usage });
  });

  test('throws on malformed data without changing previously parsed output', () => {
    const accumulator = createChatCompletionStreamAccumulator();
    expect(accumulator.push(encoder.encode(
      'data: {"choices":[{"delta":{"content":"Safe"}}]}\n\n',
    )).textDeltas).toEqual(['Safe']);

    expect(() => accumulator.push(encoder.encode('data: {not-json}\n\n'))).toThrow(
      'Malformed chat completion stream event',
    );
    expect(accumulator.finish().textDeltas).toEqual([]);
  });
});
