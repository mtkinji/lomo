import {
  SOUND_SCAPES,
  normalizeFocusVideoEnvironmentId,
  normalizeSoundscapeId,
} from './soundscapeCatalog';
import { REMOTE_AUDIO_ASSETS } from './audioAssetCatalog';

describe('Focus soundscape catalog', () => {
  it('offers only current sound environments', () => {
    expect(SOUND_SCAPES.map((soundscape) => soundscape.title)).not.toContain('Forest Stream');
    expect(SOUND_SCAPES.map((soundscape) => soundscape.title)).not.toContain('Night Meadow');
    expect(SOUND_SCAPES).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'canyonSpring', title: 'Canyon Spring' }),
      expect.objectContaining({ id: 'mountainOverlook', title: 'Mountain Overlook' }),
    ]));
    expect(SOUND_SCAPES.every((soundscape) => !('kind' in soundscape))).toBe(true);
  });

  it('admits every visible soundscape through one immutable seamless-loop contract', () => {
    expect(SOUND_SCAPES).toHaveLength(12);
    expect(new Set(SOUND_SCAPES.map((soundscape) => soundscape.loop.assetKey)).size).toBe(12);

    for (const soundscape of SOUND_SCAPES) {
      expect(soundscape.loop).toMatchObject({
        id: soundscape.id,
        loopPlayback: 'seamless',
        sampleRateHz: 48_000,
        channels: 2,
      });
      expect(soundscape.loop.assetKey).toMatch(/^[a-z0-9][a-z0-9-]+$/);

      if (soundscape.loop.source.kind === 'remote') {
        const remote = REMOTE_AUDIO_ASSETS[soundscape.loop.source.id];
        expect(remote).toBeDefined();
        expect(remote.cacheFileName).toMatch(/-[a-f0-9]{12}\.mp3$/);
      } else {
        expect(['deep-work-drift', 'canyon-spring', 'mountain-overlook']).toContain(soundscape.loop.source.key);
        expect(soundscape.loop.assetKey).toMatch(/-[a-f0-9]{12}$/);
        expect(typeof soundscape.loop.source.module).toBe('number');
      }
    }
  });

  it('moves a retired Forest Stream preference to Quiet Rain', () => {
    expect(normalizeSoundscapeId('forestStream')).toBe('quietRain');
    expect(normalizeSoundscapeId('nightMeadow')).toBe('quietRain');
    expect(normalizeSoundscapeId('oceanWaves')).toBe('oceanWaves');
    expect(normalizeSoundscapeId('not-a-track')).toBe('default');
  });

  it('keeps video-environment identity independent from audio mute state', () => {
    expect(normalizeFocusVideoEnvironmentId('canyonSpring')).toBe('canyonSpring');
    expect(normalizeFocusVideoEnvironmentId('mountainOverlook')).toBe('mountainOverlook');
    expect(normalizeFocusVideoEnvironmentId('quietRain')).toBeNull();
    expect(normalizeFocusVideoEnvironmentId(null)).toBeNull();
  });

  it('pairs Mountain Overlook with its recorded windy ridgeline audio', () => {
    const mountainOverlook = SOUND_SCAPES.find((item) => item.id === 'mountainOverlook');

    expect(mountainOverlook?.loop).toMatchObject({
      assetKey: 'mountain-overlook-wind-5c273d4ddf9f',
      source: { kind: 'bundled', key: 'mountain-overlook' },
    });
  });
});
