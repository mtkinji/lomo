import { INITIAL_LIVE_CONVERSATION_STATE, reduceLiveConversationState } from './liveConversationState';

describe('live conversation state', () => {
  it('keeps provisional transcription visible before the durable turn', () => {
    let state = reduceLiveConversationState(INITIAL_LIVE_CONVERSATION_STATE, { type: 'start' });
    state = reduceLiveConversationState(state, { type: 'connected' });
    state = reduceLiveConversationState(state, { type: 'transcript_delta', delta: 'Call ' });
    state = reduceLiveConversationState(state, { type: 'transcript_delta', delta: 'Mom' });
    expect(state).toMatchObject({ phase: 'listening', provisionalTranscript: 'Call Mom' });
    expect(reduceLiveConversationState(state, { type: 'transcript_finalized' })).toMatchObject({
      phase: 'thinking', provisionalTranscript: '',
    });
  });

  it('stops back in the same neutral composer state', () => {
    const speaking = { ...INITIAL_LIVE_CONVERSATION_STATE, phase: 'speaking' as const, elapsedSeconds: 8 };
    expect(reduceLiveConversationState(speaking, { type: 'stop' })).toEqual(INITIAL_LIVE_CONVERSATION_STATE);
  });
});
