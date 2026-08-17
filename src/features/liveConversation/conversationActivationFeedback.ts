import type { HapticsEvent } from '../../services/HapticsService';

export type ConversationMicrophoneControl = {
  setMicrophoneEnabled(enabled: boolean): void;
};

type ConversationActivationFeedbackDependencies = {
  triggerHaptic(event: HapticsEvent): void | Promise<void>;
  speakReady(): Promise<void>;
  stopSpeech(): void | Promise<void>;
  playTurnReceived(): void | Promise<void>;
  playRecovery(): void | Promise<void>;
  stopIndicators(): void;
};

type ConversationFeedbackPhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'recovering'
  | 'error';

export function createConversationActivationFeedback(
  dependencies: ConversationActivationFeedbackDependencies,
) {
  let generation = 0;
  let phase: ConversationFeedbackPhase = 'idle';

  const cancelCurrent = () => {
    generation += 1;
    void dependencies.stopSpeech();
    dependencies.stopIndicators();
  };

  const enter = (next: ConversationFeedbackPhase): boolean => {
    if (phase === next) return false;
    phase = next;
    return true;
  };

  return {
    begin() {
      if (!enter('connecting')) return;
      generation += 1;
      dependencies.stopIndicators();
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
        if (generation === readyGeneration) {
          connection.setMicrophoneEnabled(true);
          if (enter('listening')) void dependencies.triggerHaptic('canvas.toggle.on');
        }
      }
    },

    listening() {
      if (!enter('listening')) return;
      dependencies.stopIndicators();
    },

    thinking() {
      if (!enter('thinking')) return;
      void dependencies.triggerHaptic('canvas.recording.stop');
      void dependencies.playTurnReceived();
    },

    speaking() {
      if (!enter('speaking')) return;
      dependencies.stopIndicators();
      void dependencies.triggerHaptic('canvas.selection');
    },

    recovering() {
      if (!enter('recovering')) return;
      dependencies.stopIndicators();
      void dependencies.triggerHaptic('outcome.warning');
      void dependencies.playRecovery();
    },

    cancel() {
      phase = 'idle';
      cancelCurrent();
    },

    stop() {
      if (!enter('idle')) return;
      cancelCurrent();
      void dependencies.triggerHaptic('canvas.recording.stop');
    },

    fail() {
      if (!enter('error')) return;
      cancelCurrent();
      void dependencies.triggerHaptic('outcome.error');
    },
  };
}
