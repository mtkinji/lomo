import { recoverForegroundAudioRace } from './unifiedChatVoiceRecovery';

describe('Unified Chat voice foreground recovery', () => {
  test('retries once after Expo reports the first-use iOS background race', async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(
        new Error(
          'Prepare encountered an error: Error Domain=EXModulesErrorDomain Code=0 "This experience is currently in the background, so the audio session could not be activated."',
        ),
      )
      .mockResolvedValueOnce('recording');
    const waitForForeground = jest.fn().mockResolvedValue(undefined);

    await expect(recoverForegroundAudioRace(operation, waitForForeground)).resolves.toBe('recording');
    expect(waitForForeground).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('does not retry unrelated recorder failures', async () => {
    const error = new Error('Microphone unavailable');
    const operation = jest.fn<Promise<string>, []>().mockRejectedValue(error);
    const waitForForeground = jest.fn().mockResolvedValue(undefined);

    await expect(recoverForegroundAudioRace(operation, waitForForeground)).rejects.toBe(error);
    expect(waitForForeground).not.toHaveBeenCalled();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('replaces a persistent native lifecycle error with actionable copy', async () => {
    const nativeError = new Error(
      'Error Domain=EXModulesErrorDomain Code=0 "This experience is currently in the background, so the audio session could not be activated."',
    );
    const operation = jest.fn<Promise<string>, []>().mockRejectedValue(nativeError);

    await expect(recoverForegroundAudioRace(operation, async () => undefined)).rejects.toThrow(
      'Voice input could not start. Please try again.',
    );
  });
});
