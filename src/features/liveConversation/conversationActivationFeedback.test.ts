import { createConversationActivationFeedback } from './conversationActivationFeedback';

describe('conversation activation feedback', () => {
  it('confirms activation immediately, then speaks only while the microphone is muted', async () => {
    const events: string[] = [];
    const feedback = createConversationActivationFeedback({
      triggerHaptic: async (event) => { events.push(`haptic:${event}`); },
      speakReady: async () => { events.push('speech:start'); events.push('speech:end'); },
      stopSpeech: async () => { events.push('speech:stop'); },
      playTurnReceived: async () => { events.push('audio:received'); },
      playRecovery: async () => { events.push('audio:recovery'); },
      stopIndicators: () => { events.push('audio:stop'); },
    });
    const connection = {
      setMicrophoneEnabled(enabled: boolean) { events.push(`microphone:${enabled}`); },
    };

    feedback.begin();
    await feedback.ready(connection);

    expect(events).toEqual([
      'audio:stop',
      'haptic:canvas.primary.confirm',
      'microphone:false',
      'speech:start',
      'speech:end',
      'microphone:true',
      'haptic:canvas.toggle.on',
    ]);
  });

  it('gives each meaningful conversation transition one restrained feedback signature', async () => {
    const events: string[] = [];
    const feedback = createConversationActivationFeedback({
      triggerHaptic: async (event) => { events.push(`haptic:${event}`); },
      speakReady: async () => undefined,
      stopSpeech: async () => { events.push('speech:stop'); },
      playTurnReceived: async () => { events.push('audio:received'); },
      playRecovery: async () => { events.push('audio:recovery'); },
      stopIndicators: () => { events.push('audio:stop'); },
    });

    feedback.begin();
    feedback.thinking();
    feedback.thinking();
    feedback.speaking();
    feedback.listening();
    feedback.recovering();
    feedback.recovering();
    feedback.stop();

    expect(events).toEqual([
      'audio:stop',
      'haptic:canvas.primary.confirm',
      'haptic:canvas.recording.stop',
      'audio:received',
      'audio:stop',
      'haptic:canvas.selection',
      'audio:stop',
      'audio:stop',
      'haptic:outcome.warning',
      'audio:recovery',
      'speech:stop',
      'audio:stop',
      'haptic:canvas.recording.stop',
    ]);
  });

  it('restores the microphone when the verbal acknowledgement fails', async () => {
    const microphoneStates: boolean[] = [];
    const feedback = createConversationActivationFeedback({
      triggerHaptic: async () => undefined,
      speakReady: async () => { throw new Error('speech unavailable'); },
      stopSpeech: async () => undefined,
      playTurnReceived: async () => undefined,
      playRecovery: async () => undefined,
      stopIndicators: () => undefined,
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
      playTurnReceived: async () => undefined,
      playRecovery: async () => undefined,
      stopIndicators: () => undefined,
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

  it('can begin again after an unmount cancellation resets the feedback phase', () => {
    const events: string[] = [];
    const feedback = createConversationActivationFeedback({
      triggerHaptic: async (event) => { events.push(`haptic:${event}`); },
      speakReady: async () => undefined,
      stopSpeech: async () => undefined,
      playTurnReceived: async () => undefined,
      playRecovery: async () => undefined,
      stopIndicators: () => undefined,
    });

    feedback.begin();
    feedback.cancel();
    feedback.begin();

    expect(events).toEqual([
      'haptic:canvas.primary.confirm',
      'haptic:canvas.primary.confirm',
    ]);
  });
});
