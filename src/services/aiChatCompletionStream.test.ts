import { readChatCompletionStream } from './aiChatCompletionStream';

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } });
}

describe('readChatCompletionStream', () => {
  test('publishes cumulative text and returns the same final string', async () => {
    const updates: string[] = [];
    const response = streamResponse([
      'data: {"choices":[{"delta":{"content":"Fast"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" response"}}]}\n\ndata: [DONE]\n\n',
    ]);

    await expect(readChatCompletionStream(response, (text) => updates.push(text)))
      .resolves.toBe('Fast response');
    expect(updates).toEqual(['Fast', 'Fast response']);
  });
});
