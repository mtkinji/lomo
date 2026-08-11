import { createLiveConversationSpeech } from './liveConversationSpeech';

function playerHarness() {
  let listener: ((status: { playing: boolean; didJustFinish: boolean; isLoaded?: boolean }) => void) | null = null;
  return {
    player: {
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn((_event: string, next: typeof listener) => {
        listener = next;
        return { remove: jest.fn() };
      }),
    },
    emit(status: { playing: boolean; didJustFinish: boolean; isLoaded?: boolean }) {
      listener?.(status);
    },
  };
}

async function flushSpeechSetup() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('createLiveConversationSpeech', () => {
  it('plays an authenticated message stream without downloadFirst', async () => {
    const harness = playerHarness();
    const createPlayer = jest.fn(() => harness.player);
    const onStart = jest.fn();
    const speech = createLiveConversationSpeech({
      getAccessToken: async () => 'user-token',
      getPublishableKey: () => 'publishable-key',
      getFunctionUrl: () => 'https://project.functions.supabase.co/cook-voice-speech',
      createPlayer,
      fallback: { speak: jest.fn(), stop: jest.fn() },
    });

    const completion = speech.speakMessage({
      id: '9b183337-2d1d-4ad9-8f48-507fd7d77906',
      body: 'A short answer.',
    }, { onStart });
    await flushSpeechSetup();

    expect(createPlayer).toHaveBeenCalledWith(
      {
        uri: 'https://project.functions.supabase.co/cook-voice-speech?message_id=9b183337-2d1d-4ad9-8f48-507fd7d77906',
        headers: {
          Authorization: 'Bearer user-token',
          apikey: 'publishable-key',
          'x-kwilt-client': 'kwilt-mobile',
        },
      },
      expect.objectContaining({
        downloadFirst: false,
        keepAudioSessionActive: true,
        preferredForwardBufferDuration: 0,
        updateInterval: 100,
      }),
    );
    expect(onStart).not.toHaveBeenCalled();
    harness.emit({ playing: true, didJustFinish: false });
    expect(onStart).toHaveBeenCalledTimes(1);
    harness.emit({ playing: false, didJustFinish: true });
    await completion;
    expect(harness.player.remove).toHaveBeenCalledTimes(1);
  });

  it('uses the full-file fallback once when stream startup times out', async () => {
    jest.useFakeTimers();
    const harness = playerHarness();
    const fallback = { speak: jest.fn(async (_text: string, onStart?: () => void) => onStart?.()), stop: jest.fn() };
    const onFallback = jest.fn();
    const speech = createLiveConversationSpeech({
      getAccessToken: async () => 'user-token',
      getPublishableKey: () => 'publishable-key',
      getFunctionUrl: () => 'https://project.test/speech',
      createPlayer: () => harness.player,
      fallback,
      startTimeoutMs: 25,
    });

    const completion = speech.speakMessage({ id: 'message-1', body: 'Fallback answer.' }, { onFallback });
    await flushSpeechSetup();
    await jest.advanceTimersByTimeAsync(25);
    await completion;

    expect(fallback.speak).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('never resurrects fallback after explicit stop', async () => {
    jest.useFakeTimers();
    const harness = playerHarness();
    const fallback = { speak: jest.fn(async () => undefined), stop: jest.fn(async () => undefined) };
    const speech = createLiveConversationSpeech({
      getAccessToken: async () => 'user-token',
      getPublishableKey: () => 'publishable-key',
      getFunctionUrl: () => 'https://project.test/speech',
      createPlayer: () => harness.player,
      fallback,
      startTimeoutMs: 25,
    });

    const completion = speech.speakMessage({ id: 'message-1', body: 'Do not resume.' });
    await flushSpeechSetup();
    await speech.stop();
    jest.advanceTimersByTime(50);
    await completion;

    expect(harness.player.remove).toHaveBeenCalledTimes(1);
    expect(fallback.speak).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
