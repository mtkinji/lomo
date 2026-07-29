import {
  defaultPlayerIdentity,
  normalizePlayerIdentity,
  playerColor,
  type PlayerIdentity,
} from '../playerIdentity';

describe('player identity', () => {
  test('rotates accessible color defaults while keeping valid sound defaults', () => {
    expect(defaultPlayerIdentity(0)).toEqual({ colorId: 'turmeric', successSoundId: 'chime', failureSoundId: 'trombone' });
    expect(defaultPlayerIdentity(1)).toMatchObject({ colorId: 'coral' });
    expect(defaultPlayerIdentity(6)).toEqual(defaultPlayerIdentity(0));
  });

  test('normalizes missing or unknown persisted choices without losing valid choices', () => {
    expect(normalizePlayerIdentity(undefined, 2)).toEqual(defaultPlayerIdentity(2));
    expect(normalizePlayerIdentity({ colorId: 'bad', successSoundId: 'sparkle', failureSoundId: 'bonk' } as unknown as PlayerIdentity, 3)).toEqual({
      colorId: defaultPlayerIdentity(3).colorId,
      successSoundId: 'sparkle',
      failureSoundId: 'bonk',
    });
  });

  test('keeps the majestic movie-eagle hawk cry as a valid win choice', () => {
    expect(normalizePlayerIdentity({ successSoundId: 'hawk' })).toMatchObject({ successSoundId: 'hawk' });
  });

  test('resolves a concrete visual token for every default', () => {
    for (let index = 0; index < 6; index += 1) {
      expect(playerColor(defaultPlayerIdentity(index).colorId)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
