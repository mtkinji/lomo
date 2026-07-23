const EXPO_BACKGROUND_AUDIO_ERROR = 'currently in the background, so the audio session could not be activated';

function isExpoBackgroundAudioRace(error: unknown): boolean {
  return error instanceof Error && error.message.includes(EXPO_BACKGROUND_AUDIO_ERROR);
}

export async function recoverForegroundAudioRace<T>(
  operation: () => Promise<T>,
  waitForForeground: () => Promise<void>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isExpoBackgroundAudioRace(error)) throw error;
  }

  await waitForForeground();

  try {
    return await operation();
  } catch (error) {
    if (isExpoBackgroundAudioRace(error)) {
      throw new Error('Voice input could not start. Please try again.');
    }
    throw error;
  }
}
