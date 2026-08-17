import { createConversationActivationFeedback } from './conversationActivationFeedback';

describe('conversation activation feedback', () => {
  it('confirms activation immediately, then speaks only while the microphone is muted', async () => {
    const events: string[] = [];
    const feedback = createConversationActivationFeedback({
      triggerHaptic: async (event) => { events.push(`haptic:${event}`); },
      speakReady: async () => { events.push('speech:start'); events.push('speech:end'); },
      stopSpeech: async () => { events.push('speech:stop'); },
    });
    const connection = {
      setMicrophoneEnabled(enabled: boolean) { events.push(`microphone:${enabled}`); },
    };

    feedback.begin();
    await feedback.ready(connection);

    expect(events).toEqual([
      'haptic:canvas.primary.confirm',
      'microphone:false',
      'speech:start',
      'speech:end',
      'microphone:true',
    ]);
  });

  it('restores the microphone when the verbal acknowledgement fails', async () => {
    const microphoneStates: boolean[] = [];
    const feedback = createConversationActivationFeedback({
      triggerHaptic: async () => undefined,
      speakReady: async () => { throw new Error('speech unavailable'); },
      stopSpeech: async () => undefined,
    });

    feedback.begin();
    await expect(feedback.ready({
      setMicrophoneEnabled(enabled) { microphoneStates.push(enabled); },
    })).resolves.toBeUndefined();

    expect(microphoneStates).toEqual([false, true]);
  });

  it('does not reopen a stopped microphone after acknowledgement playback settles', async () => {
    let finishSpeech: () => void = () => undefined;
    const microphoneStates: boolean[] = [];
    const feedback = createConversationActivationFeedback({
      triggerHaptic: async () => undefined,
      speakReady: () => new Promise<void>((resolve) => { finishSpeech = resolve; }),
      stopSpeech: async () => undefined,
    });

    feedback.begin();
    const ready = feedback.ready({
      setMicrophoneEnabled(enabled) { microphoneStates.push(enabled); },
    });
    feedback.cancel();
    finishSpeech();
    await ready;

    expect(microphoneStates).toEqual([false]);
  });
});
