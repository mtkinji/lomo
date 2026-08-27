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

  it('normalizes completed kwilt.run function arguments without interpreting them', () => {
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'response.function_call_arguments.done',
      call_id: 'call-1',
      name: 'kwilt.run',
      arguments: '{"realtimeItemId":"item-1","channelContextVersion":1}',
    }))).toEqual({
      type: 'tool_call',
      callId: 'call-1',
      name: 'kwilt.run',
      argumentsJson: '{"realtimeItemId":"item-1","channelContextVersion":1}',
    });
  });

  it('normalizes the function call from the terminal Realtime response envelope', () => {
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'response.done',
      response: {
        output: [{
          type: 'function_call', call_id: 'call-2', name: 'kwilt.run',
          arguments: '{"realtimeItemId":"item-2","channelContextVersion":1}',
        }],
      },
    }))).toEqual({
      type: 'tool_call', callId: 'call-2', name: 'kwilt.run',
      argumentsJson: '{"realtimeItemId":"item-2","channelContextVersion":1}',
    });
  });

  it('normalizes WebRTC audio playback lifecycle events', () => {
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'output_audio_buffer.started', response_id: 'response-1',
    }))).toEqual({ type: 'assistant_audio_started', responseId: 'response-1' });
    expect(parseOpenAiRealtimeEvent(JSON.stringify({
      type: 'output_audio_buffer.stopped', response_id: 'response-1',
    }))).toEqual({ type: 'assistant_audio_stopped', responseId: 'response-1' });
  });
});
