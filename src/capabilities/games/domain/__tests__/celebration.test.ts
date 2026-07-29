import { winnerCelebration } from '../celebration';

const players = [
  { name: 'Blair', score: 480 },
  { name: 'Olive', score: 620 },
  { name: 'Grant', score: 620 },
];

describe('winnerCelebration', () => {
  test('celebrates only the transition into a finished game', () => {
    expect(winnerCelebration('playing', { status: 'finished', players })).toEqual({
      names: ['Olive', 'Grant'],
      score: 620,
    });
    expect(winnerCelebration('finished', { status: 'finished', players })).toBeNull();
    expect(winnerCelebration('playing', { status: 'playing', players })).toBeNull();
  });
});
