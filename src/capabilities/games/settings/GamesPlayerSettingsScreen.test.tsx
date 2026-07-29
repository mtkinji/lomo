import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/src/test/renderWithProviders';
import { useAppStore } from '@/src/store/useAppStore';
import { useGamesSettingsStore } from './useGamesSettingsStore';
import { GamesPlayerSettingsScreen } from './GamesPlayerSettingsScreen';

const mockGoBack = jest.fn();
const mockProfileSave = jest.fn();
const mockRosterRename = jest.fn();
const mockRosterUpdateIdentity = jest.fn();
const mockRosterArchive = jest.fn();
const mockEnsureSignedInWithPrompt = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@/src/capabilities/games/players/useGamePlayerProfile', () => ({
  useGamePlayerProfile: () => ({
    profile: {
      userId: 'user-1',
      displayName: 'Andy',
      identity: { colorId: 'rose', successSoundId: 'hawk', failureSoundId: 'bonk' },
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    },
    loading: false,
    syncing: false,
    syncError: null,
    save: mockProfileSave,
  }),
}));

jest.mock('@/src/capabilities/games/players/useSavedPlayerRoster', () => ({
  useSavedPlayerRoster: () => ({
    players: [{
      id: 'olive',
      displayName: 'Olive',
      identity: { colorId: 'mint', successSoundId: 'sparkle', failureSoundId: 'wobble' },
      linkedUserId: null,
      playCount: 2,
      lastPlayedAt: '2026-07-28T00:00:00.000Z',
      sortOrder: 0,
      archivedAt: null,
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    }],
    loading: false,
    syncing: false,
    syncError: null,
    rename: mockRosterRename,
    updateIdentity: mockRosterUpdateIdentity,
    archive: mockRosterArchive,
  }),
}));

jest.mock('@/src/capabilities/games/audio/useGameFeedback', () => ({
  useGameFeedback: () => ({ success: jest.fn(), failure: jest.fn() }),
}));

jest.mock('@/src/services/backend/auth', () => ({
  ensureSignedInWithPrompt: (...args: unknown[]) => mockEnsureSignedInWithPrompt(...args),
}));

jest.mock('@/src/capabilities/games/players/PlayerIdentityEditor', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    PlayerIdentityEditor: ({ visible }: { visible: boolean }) => visible ? <Text>My player editor open</Text> : null,
  };
});

jest.mock('@/src/capabilities/games/players/SavedPlayerEditor', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    SavedPlayerEditor: ({ player }: { player: { displayName: string } | null }) => player ? <Text>{player.displayName} editor open</Text> : null,
  };
});

describe('GamesPlayerSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', name: 'Andy' });
    useGamesSettingsStore.setState({ soundEnabled: true });
  });

  it('manages game sound defaults and reuses the existing player editors', () => {
    const screen = renderWithProviders(<GamesPlayerSettingsScreen />);

    expect(screen.getByText('Player identity')).toBeTruthy();
    expect(screen.getByText('My player')).toBeTruthy();
    expect(screen.getByText('Olive')).toBeTruthy();
    expect(screen.getByText('Mint')).toBeTruthy();

    fireEvent.press(screen.getByRole('switch', { name: 'Game sounds' }));
    expect(useGamesSettingsStore.getState().soundEnabled).toBe(false);

    fireEvent.press(screen.getByRole('button', { name: 'My player' }));
    expect(screen.getByText('My player editor open')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Olive' }));
    expect(screen.getByText('Olive editor open')).toBeTruthy();
  });

  it('routes signed-out players through the canonical Kwilt sign-in prompt', () => {
    useAppStore.getState().clearAuthIdentity();

    const screen = renderWithProviders(<GamesPlayerSettingsScreen />);

    expect(screen.getByText('Sign in')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'My player' }));
    expect(mockEnsureSignedInWithPrompt).toHaveBeenCalledWith('settings');
  });
});
