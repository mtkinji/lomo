import { fireEvent, render } from '@testing-library/react-native';
import { KwiltSwitch } from '@/src/capabilities/games/ui/KwiltSwitch';
import { GamePlayerSetup as PlayerSetup, type SetupSeat } from '@/src/capabilities/games/features/setup/GamePlayerSetup';

const seats: SetupSeat[] = [
  { key: 'one', displayName: 'Alden' },
  { key: 'two', displayName: 'Andrew' },
];

const props = {
  mode: 'farkle' as const,
  seats,
  savedPlayers: [],
  loading: false,
  onChange: jest.fn(),
  onRename: jest.fn(),
  onIdentityChange: jest.fn(),
  onArchive: jest.fn(),
  onPreviewSuccess: jest.fn(),
  onPreviewFailure: jest.fn(),
  onStart: jest.fn(),
  onLearn: jest.fn(),
  createSeat: () => ({ key: 'new', displayName: '' }),
};

const alden = {
  id: 'alden', displayName: 'Alden', linkedUserId: null, playCount: 2,
  lastPlayedAt: '2026-07-11', sortOrder: 0, archivedAt: null,
  createdAt: '2026-07-01', updatedAt: '2026-07-11',
};

describe('Farkle setup learning entry', () => {
  it.each(['bank', 'farkle'] as const)('uses the common saved-player picker in %s setup', (mode) => {
    const screen = render(<PlayerSetup {...props} mode={mode} savedPlayers={[alden]} />);

    expect(screen.getByLabelText('Alden')).toBeTruthy();
    expect(screen.getByLabelText('Edit Alden')).toBeTruthy();
    expect(screen.queryByText('Remembered on this device')).toBeNull();
    expect(screen.queryByText(mode === 'bank' ? 'Pick familiar players or add someone new.' : 'Choose two to six players for Farkle.')).toBeNull();
  });

  it('offers learn-in-one-turn once the table has valid players', () => {
    const screen = render(<PlayerSetup {...props} />);

    expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy();
    expect(screen.getByText('New to Farkle? Learn in one turn')).toBeTruthy();
  });

  it('keeps adding players as a roster action', () => {
    const onChange = jest.fn();
    const screen = render(<PlayerSetup {...props} onChange={onChange} />);

    fireEvent.press(screen.getByRole('button', { name: 'Add player' }));

    expect(onChange).toHaveBeenCalledWith([...seats, { key: 'new', displayName: '' }]);
  });

  it('keeps the learning action out of the way until setup is valid', () => {
    const screen = render(<PlayerSetup {...props} seats={[seats[0], { ...seats[1], displayName: '' }]} />);

    expect(screen.queryByText('New to Farkle? Learn in one turn')).toBeNull();
  });

  it('does not add the Farkle tutorial to Bank setup', () => {
    const screen = render(<PlayerSetup {...props} mode="bank" />);

    expect(screen.queryByText('New to Farkle? Learn in one turn')).toBeNull();
  });

  it('defaults Bank to anyone banking at any time and can switch back to turns', () => {
    const onBankingRuleChange = jest.fn();
    const screen = render(<PlayerSetup {...props} mode="bank" onBankingRuleChange={onBankingRuleChange} />);

    const bankingSwitch = screen.getByRole('switch', { name: 'Anyone can bank at any time' });
    expect(screen.UNSAFE_getByType(KwiltSwitch)).toBeTruthy();
    expect(bankingSwitch.props.accessibilityState).toEqual({ checked: true, disabled: false });

    fireEvent.press(bankingSwitch);
    expect(onBankingRuleChange).toHaveBeenCalledWith('turns');
  });

  it('can open one phone table with only the host named', () => {
    const onStartRemote = jest.fn();
    const screen = render(<PlayerSetup
      {...props}
      mode="bank"
      seats={[seats[0], { ...seats[1], displayName: '' }]}
      onUseMorePhones={onStartRemote}
    />);

    fireEvent.press(screen.getByText('Use more phones'));

    expect(onStartRemote).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Start game'));
    expect(props.onStart).not.toHaveBeenCalled();
  });

  it('keeps multi-phone play unavailable until the host is named', () => {
    const onStartRemote = jest.fn();
    const screen = render(<PlayerSetup
      {...props}
      mode="bank"
      seats={seats.map((seat) => ({ ...seat, displayName: '' }))}
      onUseMorePhones={onStartRemote}
    />);

    const remoteAction = screen.getByRole('button', { name: 'Use more phones' });
    expect(remoteAction.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(remoteAction);

    expect(onStartRemote).not.toHaveBeenCalled();
    expect(screen.queryByText('Name the host first.')).toBeNull();
  });
});
