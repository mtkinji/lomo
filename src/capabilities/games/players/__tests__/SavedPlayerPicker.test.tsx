import { fireEvent, render } from '@testing-library/react-native';
import { SavedPlayerPicker } from '../SavedPlayerPicker';
import type { SavedPlayer } from '../savedPlayers';

const players: SavedPlayer[] = [{
  id: 'alden', displayName: 'Alden', linkedUserId: null, playCount: 2,
  lastPlayedAt: '2026-07-11', sortOrder: 0, archivedAt: null,
  createdAt: '2026-07-01', updatedAt: '2026-07-11',
}];

describe('SavedPlayerPicker', () => {
  it('renders the common remembered-player contract and toggles a player', () => {
    const onToggle = jest.fn();
    const screen = render(<SavedPlayerPicker players={players} selectedIds={new Set(['alden'])} onToggle={onToggle} />);

    fireEvent.press(screen.getByLabelText('Alden, selected'));

    expect(onToggle).toHaveBeenCalledWith(players[0]);
    expect(screen.queryByText('Remembered on this device')).toBeNull();
  });

  it('shows a separate, visible edit action without changing selection', () => {
    const onEdit = jest.fn();
    const onToggle = jest.fn();
    const screen = render(<SavedPlayerPicker players={players} selectedIds={new Set()} onToggle={onToggle} onEdit={onEdit} />);

    fireEvent.press(screen.getByLabelText('Edit Alden'));

    expect(onEdit).toHaveBeenCalledWith(players[0]);
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.queryByText('Remembered on this device')).toBeNull();
  });

  it('keeps personal bests separate from player pills and appends add player to the pill row', () => {
    const onAdd = jest.fn();
    const screen = render(<SavedPlayerPicker
      players={players}
      selectedIds={new Set()}
      onToggle={jest.fn()}
      onAdd={onAdd}
      personalBestFor={(player) => 'id' in player && player.id === 'alden' ? 640 : null}
    />);

    expect(screen.getByText('PERSONAL BESTS')).toBeTruthy();
    expect(screen.getByLabelText('Personal bests: Alden, 640')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add player' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
