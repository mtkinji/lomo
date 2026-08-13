import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prepareSoundscapeLoopAsset } from './soundscapeLoopAsset';
import { resolveSoundscapeSource, SOUND_SCAPES } from './soundscape';

jest.mock('./soundscapeLoopAsset', () => ({
  prepareSoundscapeLoopAsset: jest.fn(),
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

jest.mock('./nativeCrashBreadcrumbs', () => ({
  nativeCrashErrorMessage: jest.fn(),
  recordNativeCrashBreadcrumb: jest.fn(async () => undefined),
}));

const prepareSoundscapeLoopAssetMock = prepareSoundscapeLoopAsset as jest.Mock;

describe('Focus soundscape sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prepareSoundscapeLoopAssetMock.mockImplementation(async (id: string) => ({
      uri: `file:///cache/${id}.mp3`, assetKey: id, sampleRateHz: 48_000, channels: 2,
    }));
  });

  test('keeps Deep Work Drift as the bundled offline fallback', async () => {
    const source = await resolveSoundscapeSource('default');
    expect(source).toEqual({ uri: 'file:///cache/default.mp3' });
  });

  test('keeps the prototype stream audio bundled and independent from video playback', async () => {
    const source = await resolveSoundscapeSource('canyonSpring');
    expect(source).toEqual({ uri: 'file:///cache/canyonSpring.mp3' });
  });

  test('resolves existing and approved Focus tracks through remote cache delivery', async () => {
    prepareSoundscapeLoopAssetMock.mockImplementation(async (id: string) => ({
      uri: `file:///cache/${id}.mp3`, assetKey: id, sampleRateHz: 48_000, channels: 2,
    }));

    await expect(resolveSoundscapeSource('copacabanaFocus')).resolves.toEqual({ uri: 'file:///cache/copacabanaFocus.mp3' });

    await expect(resolveSoundscapeSource('openRoadFocus')).resolves.toEqual({ uri: 'file:///cache/openRoadFocus.mp3' });

    await expect(resolveSoundscapeSource('cedarWorkshop')).resolves.toEqual({ uri: 'file:///cache/cedarWorkshop.mp3' });

    await expect(resolveSoundscapeSource('rainlitLibrary')).resolves.toEqual({ uri: 'file:///cache/rainlitLibrary.mp3' });

    await expect(resolveSoundscapeSource('quietRain')).resolves.toEqual({ uri: 'file:///cache/quietRain.mp3' });

    await expect(resolveSoundscapeSource('oceanWaves')).resolves.toEqual({ uri: 'file:///cache/oceanWaves.mp3' });

    await expect(resolveSoundscapeSource('fireplace')).resolves.toEqual({ uri: 'file:///cache/fireplace.mp3' });

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
    ]);
  });

  test('uses the shared loop transport without retaining a Canyon-only scheduler', () => {
    const source = readFileSync(path.join(__dirname, 'soundscape.ts'), 'utf8');

    expect(source).toContain("from './soundscapeLoopTransport'");
    expect(source).not.toContain('crossfadeCanyonSpringLoop');
    expect(source).not.toContain("from 'expo-av'");
    expect(source).not.toContain("import('expo-av')");
  });

  test('unloads the native player before Fast Refresh replaces the module', () => {
    const source = readFileSync(path.join(__dirname, 'soundscape.ts'), 'utf8');

    expect(source).toContain('disposeSoundscapeForFastRefresh');
    expect(source).toContain('hot?.dispose');
  });
});
