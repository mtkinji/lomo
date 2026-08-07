import * as Speech from 'expo-speech';

import { cookVoiceNaturalSpeech } from './cookVoiceNaturalSpeech';
import { createCookVoiceSpeechPolicy } from './cookVoiceSpeechPolicy';

const cookVoiceSystemSpeech = {
  async speak(text: string, onStart?: () => void): Promise<void> {
    await Speech.stop();
    await new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        rate: 0.48,
        pitch: 1,
        onStart,
        onDone: resolve,
        onStopped: resolve,
        onError: reject,
      });
    });
  },
  stop: Speech.stop,
};

export const cookVoiceSpeech = createCookVoiceSpeechPolicy({
  natural: cookVoiceNaturalSpeech,
  fallback: cookVoiceSystemSpeech,
});
