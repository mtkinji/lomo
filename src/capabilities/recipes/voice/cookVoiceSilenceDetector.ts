export function createCookVoiceSilenceDetector(input: {
  silenceMs?: number;
  speechThreshold?: number;
  minimumSpeechFrames?: number;
} = {}) {
  const silenceMs = input.silenceMs ?? 900;
  const speechThreshold = input.speechThreshold ?? 0.12;
  const minimumSpeechFrames = input.minimumSpeechFrames ?? 3;
  let lastSpeechAt: number | null = null;
  let speechFrames = 0;
  let speechConfirmed = false;

  return {
    observe(level: number, now: number): boolean {
      if (level >= speechThreshold) {
        speechFrames += 1;
        speechConfirmed = speechConfirmed || speechFrames >= minimumSpeechFrames;
        lastSpeechAt = now;
        return false;
      }

      if (!speechConfirmed) {
        speechFrames = 0;
        lastSpeechAt = null;
        return false;
      }

      return lastSpeechAt !== null && now - lastSpeechAt >= silenceMs;
    },
  };
}
