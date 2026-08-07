export type CookVoiceSpeechPath = {
  speak(text: string, onStart?: () => void): Promise<void>;
  stop(): Promise<void>;
};

export function createCookVoiceSpeechPolicy({
  natural,
  fallback,
}: {
  natural: CookVoiceSpeechPath;
  fallback: CookVoiceSpeechPath;
}): CookVoiceSpeechPath {
  return {
    async speak(text, onStart) {
      try {
        await natural.speak(text, onStart);
      } catch {
        await fallback.speak(text, onStart);
      }
    },
    async stop() {
      await Promise.allSettled([natural.stop(), fallback.stop()]);
    },
  };
}
