import { shouldDeleteLegacyCookVoiceFile } from './cookVoiceCacheCleanup';

describe('shouldDeleteLegacyCookVoiceFile', () => {
  const now = Date.UTC(2026, 7, 10, 18);

  it('deletes only stale Kwilt voice cache files', () => {
    expect(shouldDeleteLegacyCookVoiceFile({
      name: 'kwilt-cook-voice-1.mp3', modificationTime: now - 3_600_001,
    }, now)).toBe(true);
    expect(shouldDeleteLegacyCookVoiceFile({
      name: 'kwilt-cook-voice-2.mp3', modificationTime: now - 60_000,
    }, now)).toBe(false);
    expect(shouldDeleteLegacyCookVoiceFile({
      name: 'family-photo.jpg', modificationTime: now - 86_400_000,
    }, now)).toBe(false);
    expect(shouldDeleteLegacyCookVoiceFile({
      name: 'kwilt-cook-voice-3.mp3', modificationTime: null,
    }, now)).toBe(false);
  });
});
