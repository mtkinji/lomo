import { createChatCompletionStreamAccumulator } from '../../supabase/functions/_shared/aiChatCompletionStream';

export async function readChatCompletionStream(
  response: Response,
  onTextUpdate: (text: string) => void,
): Promise<string> {
  if (!response.body) throw new Error('Streaming response body missing');
  const reader = response.body.getReader();
  const accumulator = createChatCompletionStreamAccumulator();
  let text = '';

  const publish = (deltas: readonly string[]) => {
    for (const delta of deltas) {
      text += delta;
      onTextUpdate(text);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) publish(accumulator.push(value).textDeltas);
  }
  publish(accumulator.finish().textDeltas);
  if (!text.trim()) throw new Error('OpenAI coach chat response missing content');
  return text;
}
