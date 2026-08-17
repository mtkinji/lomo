import * as Speech from 'expo-speech';

import { HapticsService } from '../../services/HapticsService';
import { createConversationActivationFeedback } from './conversationActivationFeedback';

const READY_ACKNOWLEDGEMENT = 'I’m listening.';

export const conversationActivationFeedback = createConversationActivationFeedback({
  triggerHaptic: (event) => HapticsService.trigger(event),
  stopSpeech: () => Speech.stop(),
  speakReady: async () => {
    await Speech.stop();
    await new Promise<void>((resolve, reject) => {
      Speech.speak(READY_ACKNOWLEDGEMENT, {
        rate: 0.52,
        pitch: 1,
        onDone: resolve,
        onStopped: resolve,
        onError: reject,
      });
    });
  },
});
