import { fireEvent, render } from '@testing-library/react-native';
import { GamePlayerSetup } from '../GamePlayerSetup';

const alden = {
  id: 'alden', displayName: 'Alden', linkedUserId: null, playCount: 2,
  lastPlayedAt: '2026-07-11', sortOrder: 0, archivedAt: null,
  createdAt: '2026-07-01', updatedAt: '2026-07-11',
};

const common = {
  savedPlayers: [alden],
  loading: false,
  onRename: jest.fn(),
  onIdentityChange: jest.fn(),
  onArchive: jest.fn(),
  onPreviewSuccess: jest.fn(),
  onPreviewFailure: jest.fn(),
  createSeat: () => ({ key: 'new', displayName: '' }),
};

describe('GamePlayerSetup', () => {
  it('uses the Bank setup contract for a remote-only game without inventing local seats', () => {
    const onChange = jest.fn();
    const onUseMorePhones = jest.fn();
    const screen = render(<GamePlayerSetup
      {...common}
      mode="remote-only"
      seats={[{ key: 'host', displayName: 'Andrew' }]}
      onChange={onChange}
      onUseMorePhones={onUseMorePhones}
      remoteCapacity={8}
    />);

    expect(screen.getByText('Who’s playing?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add player' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start game' })).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Use more phones' }));
    expect(onUseMorePhones).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Alden'));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'host', savedPlayerId: 'alden', displayName: 'Alden' }),
    ]);
  });

  it('keeps local connection games on the same player and start surface', () => {
    const onStart = jest.fn();
    const screen = render(<GamePlayerSetup
      {...common}
      mode="connection"
      seats={[{ key: 'one', displayName: 'Andrew' }, { key: 'two', displayName: 'Blair' }]}
      onChange={jest.fn()}
      onStart={onStart}
      startLabel="Start together"
    />);

    expect(screen.getByRole('button', { name: 'Add player' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Start together' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('lets a local table start immediately with neutral player names', () => {
    const onStart = jest.fn();
    const screen = render(<GamePlayerSetup
      {...common}
      mode="connection"
      seats={[{ key: 'one', displayName: '' }, { key: 'two', displayName: '' }]}
      onChange={jest.fn()}
      onStart={onStart}
    />);

    expect(screen.getByText('Names are optional for local play.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Play now' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('still requires a named host before opening a remote table', () => {
    const onUseMorePhones = jest.fn();
    const screen = render(<GamePlayerSetup
      {...common}
      mode="remote-only"
      seats={[{ key: 'host', displayName: '' }]}
      onChange={jest.fn()}
      onUseMorePhones={onUseMorePhones}
    />);

    expect(screen.getByRole('button', { name: 'Use more phones' })).toBeDisabled();
  });

  it('uses the later Bank hierarchy for player and launch actions', () => {
    const screen = render(<GamePlayerSetup
      {...common}
      mode="bank"
      seats={[{ key: 'one', displayName: 'Andrew' }, { key: 'two', displayName: 'Blair' }]}
      onChange={jest.fn()}
      onStart={jest.fn()}
      onUseMorePhones={jest.fn()}
      personalBestFor={(player) => 'id' in player && player.id === 'alden' ? 640 : null}
    />);

    expect(screen.queryByText('Pick familiar players or add someone new.')).toBeNull();
    expect(screen.getByText('PERSONAL BESTS')).toBeTruthy();
    expect(screen.getByText('640')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start game' })).toHaveStyle({ width: '100%' });
    expect(screen.getByRole('button', { name: 'Add player' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use more phones' })).toBeTruthy();
  });
});
