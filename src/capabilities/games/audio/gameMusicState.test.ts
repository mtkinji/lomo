import { bankMusicForState } from '../gameMusicState';

describe('Bank music state', () => {
  test('starts the base track with the round and keeps it through the safe rolls', () => {
    expect(bankMusicForState({ status: 'playing', rollInRound: 0, pot: 0 })).toBe('game.bank-initial');
    expect(bankMusicForState({ status: 'playing', rollInRound: 2, pot: 18 })).toBe('game.bank-initial');
  });

  test('stays silent after the game', () => {
    expect(bankMusicForState({ status: 'finished', rollInRound: 8, pot: 120 })).toBeNull();
  });

  test('uses the reviewed intensity order as risk rises', () => {
    expect(bankMusicForState({ status: 'playing', rollInRound: 3, pot: 20 })).toBe('game.bank-initial');
    expect(bankMusicForState({ status: 'playing', rollInRound: 5, pot: 35 })).toBe('game.bank-building');
    expect(bankMusicForState({ status: 'playing', rollInRound: 7, pot: 80 })).toBe('game.bank-maximum');
  });
});
