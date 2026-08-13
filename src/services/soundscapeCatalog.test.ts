import {
  SOUND_SCAPES,
  normalizeFocusVideoEnvironmentId,
  normalizeSoundscapeId,
} from './soundscapeCatalog';

describe('Focus soundscape catalog', () => {
  it('offers only current sound environments', () => {
    expect(SOUND_SCAPES.map((soundscape) => soundscape.title)).not.toContain('Forest Stream');
    expect(SOUND_SCAPES.map((soundscape) => soundscape.title)).not.toContain('Night Meadow');
    expect(SOUND_SCAPES).toContainEqual({ id: 'canyonSpring', title: 'Canyon Spring' });
    expect(SOUND_SCAPES.every((soundscape) => !('kind' in soundscape))).toBe(true);
  });

  it('moves a retired Forest Stream preference to Quiet Rain', () => {
    expect(normalizeSoundscapeId('forestStream')).toBe('quietRain');
    expect(normalizeSoundscapeId('nightMeadow')).toBe('quietRain');
    expect(normalizeSoundscapeId('oceanWaves')).toBe('oceanWaves');
    expect(normalizeSoundscapeId('not-a-track')).toBe('default');
  });

  it('keeps video-environment identity independent from audio mute state', () => {
    expect(normalizeFocusVideoEnvironmentId('canyonSpring')).toBe('canyonSpring');
    expect(normalizeFocusVideoEnvironmentId('quietRain')).toBeNull();
    expect(normalizeFocusVideoEnvironmentId(null)).toBeNull();
  });
});
