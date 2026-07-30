import {
  AUDIO_GAIN_POLICY,
  AUDIO_MIX_TRANSITIONS,
  audioGainForCategory,
  duckedMusicGain,
  type AudioCategory,
} from '../audioGainPolicy';

const requiredCategories: AudioCategory[] = [
  'ui.micro',
  'ui.outcome',
  'game.mechanic',
  'game.signature',
  'game.pattern',
  'game.music',
  'focus.music',
];

describe('audio gain policy', () => {
  test('defines a complete mastering and runtime contract for every audio category', () => {
    expect(Object.keys(AUDIO_GAIN_POLICY).sort()).toEqual([...requiredCategories].sort());

    requiredCategories.forEach((category) => {
      const policy = AUDIO_GAIN_POLICY[category];
      expect(policy.targetLufs).toBeLessThan(0);
      expect(policy.allowedSpreadLu).toBeGreaterThan(0);
      expect(policy.truePeakCeilingDbtp).toBeLessThan(0);
      expect(policy.runtimeGain).toBeGreaterThan(0);
      expect(policy.runtimeGain).toBeLessThanOrEqual(1);
    });
  });

  test('keeps the player signature library tighter than general effects', () => {
    expect(AUDIO_GAIN_POLICY['game.signature'].allowedSpreadLu).toBe(1);
    expect(AUDIO_GAIN_POLICY['game.signature'].allowedSpreadLu)
      .toBeLessThan(AUDIO_GAIN_POLICY['game.mechanic'].allowedSpreadLu);
  });

  test('keeps background music below foreground effects at runtime', () => {
    expect(audioGainForCategory('game.music')).toBeLessThan(audioGainForCategory('game.mechanic'));
    expect(audioGainForCategory('focus.music')).toBeLessThan(audioGainForCategory('game.signature'));
  });

  test('converts the documented music duck into a deterministic linear gain', () => {
    expect(duckedMusicGain('signature')).toBeCloseTo(0.1055, 4);
    expect(duckedMusicGain('mechanic')).toBeCloseTo(0.2105, 4);
    expect(duckedMusicGain('none')).toBe(AUDIO_GAIN_POLICY['game.music'].runtimeGain);
  });

  test('uses bounded fades so signatures arrive quickly and music returns gently', () => {
    expect(AUDIO_MIX_TRANSITIONS.signatureDuck.attackMs).toBe(80);
    expect(AUDIO_MIX_TRANSITIONS.signatureDuck.releaseMs).toBe(450);
    expect(AUDIO_MIX_TRANSITIONS.mechanicDuck.attackMs).toBe(60);
    expect(AUDIO_MIX_TRANSITIONS.musicCrossfadeMs).toEqual({ min: 800, max: 1_200 });
  });
});
