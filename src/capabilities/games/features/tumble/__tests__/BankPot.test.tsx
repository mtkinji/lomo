import { act, render } from '@testing-library/react-native';
import { BankPot } from '../BankPot';

describe('BankPot', () => {
  it('keeps an exceptional exact value readable and names the risk state', async () => {
    const screen = render(<BankPot pot={250_000} rollInRound={4} message="Added 8" rolling={false} />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('AT RISK')).toBeTruthy();
    expect(screen.getByLabelText('At risk, 250,000 points')).toBeTruthy();
  });

  it('announces and stages a catastrophic seven-out', async () => {
    const screen = render(<BankPot pot={1_000} rollInRound={4} message="Added 8" rolling={false} />);
    await act(async () => { await Promise.resolve(); });

    screen.rerender(<BankPot pot={0} rollInRound={0} message="Seven out — new round" rolling={false} />);

    expect(screen.getByLabelText('Seven out. Pot reset to zero.')).toBeTruthy();
    expect(screen.getByText('1,000 GONE!')).toBeTruthy();
  });
});
