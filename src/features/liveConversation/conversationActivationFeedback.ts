import type { HapticsEvent } from '../../services/HapticsService';

export type ConversationMicrophoneControl = {
  setMicrophoneEnabled(enabled: boolean): void;
};

type ConversationActivationFeedbackDependencies = {
  triggerHaptic(event: HapticsEvent): void | Promise<void>;
  speakReady(): Promise<void>;
  stopSpeech(): void | Promise<void>;
};

export function createConversationActivationFeedback(
  dependencies: ConversationActivationFeedbackDependencies,
) {
  let generation = 0;

  const cancel = () => {
    generation += 1;
    void dependencies.stopSpeech();
  };

  return {
    begin() {
      generation += 1;
      void dependencies.triggerHaptic('canvas.primary.confirm');
    },

    async ready(connection: ConversationMicrophoneControl): Promise<void> {
      const readyGeneration = generation;
      connection.setMicrophoneEnabled(false);
      try {
        await dependencies.speakReady();
      } catch {
        // The visible Live Dock remains the dependable acknowledgement.
      } finally {
        if (generation === readyGeneration) connection.setMicrophoneEnabled(true);
      }
    },

    cancel,

    stop() {
      cancel();
      void dependencies.triggerHaptic('canvas.recording.stop');
    },

    fail() {
      cancel();
      void dependencies.triggerHaptic('outcome.error');
    },
  };
}
