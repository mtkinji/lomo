import { render } from '@testing-library/react-native';
import { createBankGame } from '@/src/capabilities/games/domain/bank';
import { BankBroadcastBoard } from '../BankBroadcastBoard';

describe('BankBroadcastBoard', () => {
  test('keeps standings, stakes, and turn context visible together', () => {
    const game = {
      ...createBankGame(['Ada', 'Benjamin', 'Cy']),
      pot: 42,
      round: 4,
      activePlayer: 1,
      message: 'Two safe rolls left',
      players: createBankGame(['Ada', 'Benjamin', 'Cy']).players.map((player, index) => ({
        ...player,
        score: [120, 85, 60][index],
        banked: index === 2,
      })),
    };

    const screen = render(<BankBroadcastBoard game={game} dice={[3, 5]} identities={[]} rolling={false} />);

    expect(screen.getByText('STANDINGS')).toBeTruthy();
    expect(screen.getByLabelText('Pot, 42 points')).toBeTruthy();
    expect(screen.getAllByText('Benjamin')).toHaveLength(2);
    expect(screen.getByText('ROUND 4 OF 10')).toBeTruthy();
    expect(screen.getByText('Two safe rolls left')).toBeTruthy();
    expect(screen.getByText('BANKED')).toBeTruthy();
  });

  test('keeps six players identifiable in compact landscape', () => {
    const game = {
      ...createBankGame(['Andrew', 'Olive', 'Grandma Eleanor', 'Alden', 'Maya', 'Benjamin']),
      activePlayer: 2,
      players: createBankGame(['Andrew', 'Olive', 'Grandma Eleanor', 'Alden', 'Maya', 'Benjamin']).players.map((player, index) => ({
        ...player,
        banked: index === 5,
      })),
    };

    const screen = render(<BankBroadcastBoard game={game} dice={[2, 6]} identities={[]} rolling compact />);

    expect(screen.getByLabelText('Grandma Eleanor, 0 points, current player')).toBeTruthy();
    expect(screen.getByLabelText('Benjamin, 0 points, banked')).toBeTruthy();
    expect(screen.getByText('ROLLING')).toBeTruthy();
  });

  test('labels the completed game as a final score', () => {
    const game = { ...createBankGame(['Ada', 'Ben']), status: 'finished' as const, message: 'Ada wins with 90' };
    const screen = render(<BankBroadcastBoard game={game} dice={[3, 4]} identities={[]} rolling={false} personalBestLabels={['NEW BEST · 90', 'BEST · 75']} />);

    expect(screen.getByText('FINAL SCORE')).toBeTruthy();
    expect(screen.getByText('Ada wins with 90')).toBeTruthy();
    expect(screen.getByText('NEW BEST · 90')).toBeTruthy();
    expect(screen.getByText('BEST · 75')).toBeTruthy();
  });
});
