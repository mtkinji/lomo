import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveAudioAsset } from './audioAssetDelivery';
import { resolveSoundscapeSource, SOUND_SCAPES } from './soundscape';

jest.mock('./audioAssetDelivery', () => ({
  resolveAudioAsset: jest.fn(),
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

jest.mock('./nativeCrashBreadcrumbs', () => ({
  nativeCrashErrorMessage: jest.fn(),
  recordNativeCrashBreadcrumb: jest.fn(async () => undefined),
}));

const resolveAudioAssetMock = resolveAudioAsset as jest.Mock;

describe('Focus soundscape sources', () => {
  beforeEach(() => jest.clearAllMocks());

  test('keeps Deep Work Drift as the bundled offline fallback', async () => {
    const source = await resolveSoundscapeSource('default');
    expect(typeof source).toBe('number');
    expect(resolveAudioAssetMock).not.toHaveBeenCalled();
  });

  test('keeps the prototype stream audio bundled and independent from video playback', async () => {
    const source = await resolveSoundscapeSource('canyonSpring');
    expect(typeof source).toBe('number');
    expect(resolveAudioAssetMock).not.toHaveBeenCalled();
  });

  test('resolves existing and approved Focus tracks through remote cache delivery', async () => {
    resolveAudioAssetMock.mockResolvedValue({ uri: 'file:///cache/track.mp3', sourceKind: 'cache' });

    await expect(resolveSoundscapeSource('copacabanaFocus')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.copacabana');

    await expect(resolveSoundscapeSource('openRoadFocus')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.open-road');

    await expect(resolveSoundscapeSource('cedarWorkshop')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.cedar-workshop');

    await expect(resolveSoundscapeSource('rainlitLibrary')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.rainlit-library');

    await expect(resolveSoundscapeSource('quietRain')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.quiet-rain');

    await expect(resolveSoundscapeSource('oceanWaves')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.ocean-waves');

    await expect(resolveSoundscapeSource('fireplace')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.fireplace');

    await expect(resolveSoundscapeSource('nightMeadow')).resolves.toEqual({ uri: 'file:///cache/track.mp3' });
    expect(resolveAudioAssetMock).toHaveBeenCalledWith('focus.night-meadow');
  });

  test('offers one flat soundscape list without Forest Stream', () => {
    expect(SOUND_SCAPES.map((item) => item.id)).toEqual([
      'default',
      'copacabanaFocus',
      'focusFlowState',
      'midnightStudySession',
      'openRoadFocus',
      'cedarWorkshop',
      'rainlitLibrary',
      'quietRain',
      'canyonSpring',
      'oceanWaves',
      'fireplace',
      'nightMeadow',
    ]);
    expect(SOUND_SCAPES.map((item) => item.title)).toEqual([
      'Deep Work Drift',
      'Copacabana',
      'Focus Tunnel',
      'Midnight Study',
      'Open Road',
      'Cedar Workshop',
      'Rainlit Library',
      'Quiet Rain',
      'Canyon Spring',
      'Ocean Waves',
      'Fireplace',
      'Night Meadow',
    ]);
  });

  test('uses the supported Expo audio module without retaining expo-av', () => {
    const source = readFileSync(path.join(__dirname, 'soundscape.ts'), 'utf8');

    expect(source).toContain("from 'expo-audio'");
    expect(source).not.toContain("from 'expo-av'");
    expect(source).not.toContain("import('expo-av')");
  });

  test('unloads the native player before Fast Refresh replaces the module', () => {
    const source = readFileSync(path.join(__dirname, 'soundscape.ts'), 'utf8');

    expect(source).toContain('disposeSoundscapeForFastRefresh');
    expect(source).toContain('hot?.dispose');
  });
});
