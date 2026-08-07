import * as Speech from 'expo-speech';

export const cookVoiceSpeech = {
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
