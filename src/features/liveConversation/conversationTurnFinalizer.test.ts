import { createConversationTurnFinalizer } from './conversationTurnFinalizer';

describe('createConversationTurnFinalizer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('promotes a frozen provisional transcript when the provider final never arrives', () => {
    const finalized: Array<{ itemId: string; transcript: string; source: string }> = [];
    const finalizer = createConversationTurnFinalizer({
      fallbackDelayMs: 2_000,
      onFinalized: (utterance) => finalized.push(utterance),
    });

    finalizer.handle({ type: 'speech_started', itemId: 'item-1' });
    finalizer.handle({ type: 'transcript_delta', itemId: 'item-1', delta: 'Call Mom' });
    finalizer.handle({ type: 'speech_stopped', itemId: 'item-1' });
    jest.advanceTimersByTime(1_999);
    expect(finalized).toEqual([]);

    jest.advanceTimersByTime(1);
    expect(finalized).toEqual([
      { itemId: 'item-1', transcript: 'Call Mom', source: 'frozen_provisional' },
    ]);
  });

  it('prefers the provider final and ignores a duplicate that arrives after fallback', () => {
    const finalized: Array<{ itemId: string; transcript: string; source: string }> = [];
    const finalizer = createConversationTurnFinalizer({
      fallbackDelayMs: 2_000,
      onFinalized: (utterance) => finalized.push(utterance),
    });

    finalizer.handle({ type: 'transcript_delta', itemId: 'item-1', delta: 'First turn' });
    finalizer.handle({ type: 'speech_stopped', itemId: 'item-1' });
    finalizer.handle({ type: 'transcript_final', itemId: 'item-1', transcript: 'First turn.' });
    jest.advanceTimersByTime(2_000);

    finalizer.handle({ type: 'transcript_delta', itemId: 'item-2', delta: 'Second turn' });
    finalizer.handle({ type: 'speech_stopped', itemId: 'item-2' });
    jest.advanceTimersByTime(2_000);
    finalizer.handle({ type: 'transcript_final', itemId: 'item-2', transcript: 'Second turn.' });

    expect(finalized).toEqual([
      { itemId: 'item-1', transcript: 'First turn.', source: 'provider_final' },
      { itemId: 'item-2', transcript: 'Second turn', source: 'frozen_provisional' },
    ]);
  });

  it('keeps late deltas available during the finalization grace period and cancels on reset', () => {
    const finalized: string[] = [];
    const finalizer = createConversationTurnFinalizer({
      fallbackDelayMs: 2_000,
      onFinalized: ({ transcript }) => finalized.push(transcript),
    });

    finalizer.handle({ type: 'transcript_delta', itemId: 'item-1', delta: 'What should' });
    finalizer.handle({ type: 'speech_stopped', itemId: 'item-1' });
    finalizer.handle({ type: 'transcript_delta', itemId: 'item-1', delta: ' I make?' });
    jest.advanceTimersByTime(2_000);
    expect(finalized).toEqual(['What should I make?']);

    finalizer.handle({ type: 'transcript_delta', itemId: 'item-2', delta: 'Discard me' });
    finalizer.handle({ type: 'speech_stopped', itemId: 'item-2' });
    finalizer.reset();
    jest.advanceTimersByTime(2_000);
    expect(finalized).toEqual(['What should I make?']);
  });
});
