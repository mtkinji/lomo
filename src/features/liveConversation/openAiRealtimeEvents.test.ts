import { parseOpenAiRealtimeEvent } from './openAiRealtimeEvents';

describe('OpenAI Realtime event normalization', () => {
  it('normalizes provisional and final input transcripts', () => {
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'input_audio_buffer.speech_started', item_id: 'item-1',
    }))).toEqual({ type: 'speech_started', itemId: 'item-1' });
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'input_audio_buffer.speech_stopped', item_id: 'item-1',
    }))).toEqual({ type: 'speech_stopped', itemId: 'item-1' });
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'conversation.item.input_audio_transcription.delta', item_id: 'item-1', delta: 'Hello',
    }))).toEqual({ type: 'transcript_delta', itemId: 'item-1', delta: 'Hello' });
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'conversation.item.input_audio_transcription.completed', item_id: 'item-1', transcript: ' Hello there ',
    }))).toEqual({ type: 'transcript_final', itemId: 'item-1', transcript: 'Hello there' });
  });

  it('ignores malformed and unrelated provider events', () => {
    expect(parseOpenAiRealtimeEvent('not json')).toBeNull();
    expect(parseOpenAiRealtimeEvent(JSON.stringify({ type: 'session.updated' }))).toBeNull();
  });
});
