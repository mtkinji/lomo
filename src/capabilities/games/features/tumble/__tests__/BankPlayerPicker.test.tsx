import { fireEvent, render } from '@testing-library/react-native';
import { applyBankRoll, createBankGame } from '@/src/capabilities/games/domain/bank';
import { BankPlayerPicker } from '../BankPlayerPicker';

describe('Bank player picker', () => {
  it('banks every selected player in one action', () => {
    const game = applyBankRoll(createBankGame(['Ada', 'Ben', 'Cy']), [3, 3]);
    const onBank = jest.fn();
    const screen = render(<BankPlayerPicker game={game} open onClose={jest.fn()} onBank={onBank} />);

    fireEvent.press(screen.getByRole('checkbox', { name: 'Ada' }));
    fireEvent.press(screen.getByRole('checkbox', { name: 'Cy' }));
    fireEvent.press(screen.getByRole('button', { name: 'Bank us!' }));

    expect(onBank).toHaveBeenCalledWith([1, 3]);
  });
});
