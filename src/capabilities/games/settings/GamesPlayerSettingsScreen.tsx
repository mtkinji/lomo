import { Fragment, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '@/src/navigation/RootNavigator';
import { ensureSignedInWithPrompt } from '@/src/services/backend/auth';
import { useAppStore } from '@/src/store/useAppStore';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsToggleRow,
} from '@/src/ui/SettingsSurface';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import { PlayerIdentityEditor } from '@/src/capabilities/games/players/PlayerIdentityEditor';
import { SavedPlayerEditor } from '@/src/capabilities/games/players/SavedPlayerEditor';
import type { SavedPlayer } from '@/src/capabilities/games/players/savedPlayers';
import { PLAYER_COLORS, normalizePlayerIdentity } from '@/src/capabilities/games/players/playerIdentity';
import { useGamePlayerProfile } from '@/src/capabilities/games/players/useGamePlayerProfile';
import { useSavedPlayerRoster } from '@/src/capabilities/games/players/useSavedPlayerRoster';
import { useGamesSettingsStore } from './useGamesSettingsStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsGames'>;

export function GamesPlayerSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const userId = authIdentity?.userId ?? null;
  const fallbackName = authIdentity?.name?.trim()
    || userProfile?.fullName?.trim()
    || authIdentity?.email?.split('@')[0]
    || 'You';
  const playerProfile = useGamePlayerProfile({ userId, fallbackName });
  const roster = useSavedPlayerRoster({ userId });
  const soundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const setSoundEnabled = useGamesSettingsStore((state) => state.setSoundEnabled);
  const feedback = useGameFeedback(true);
  const [editingSelf, setEditingSelf] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<SavedPlayer | null>(null);

  const profileFooter = playerProfile.syncError
    ?? (userId
      ? 'Your color and win/fail sounds follow your signed-in Kwilt account.'
      : 'Sign in to create a player identity that follows you across devices.');
  const rosterFooter = roster.syncError
    ?? 'Remembered players are created during game setup and stay editable here.';

  return (
    <>
      <SettingsPage title="Games" onBack={() => navigation.goBack()}>
        <SettingsGroup title="Play" footer="This is the starting sound behavior for Games. You can still mute an individual table while playing.">
          <SettingsToggleRow
            enabled={soundEnabled}
            title="Game sounds"
            onPress={() => setSoundEnabled(!soundEnabled)}
          />
        </SettingsGroup>

        <SettingsGroup title="Player identity" footer={profileFooter}>
          <SettingsRow
            disabled={Boolean(userId && playerProfile.loading)}
            title="My player"
            value={userId
              ? playerProfile.loading
                ? 'Loading…'
                : playerProfile.profile?.displayName ?? 'Set up'
              : 'Sign in'}
            onPress={() => {
              if (!userId) {
                void ensureSignedInWithPrompt('settings');
                return;
              }
              if (playerProfile.profile) setEditingSelf(true);
            }}
          />
        </SettingsGroup>

        <SettingsGroup title="Saved players" footer={rosterFooter}>
          {roster.loading ? (
            <SettingsRow disabled title="Loading players…" />
          ) : roster.players.length === 0 ? (
            <SettingsRow disabled title="No saved players yet" />
          ) : roster.players.map((player, index) => {
            const identity = normalizePlayerIdentity(player.identity);
            const color = PLAYER_COLORS.find((choice) => choice.id === identity.colorId)?.label;
            return (
              <Fragment key={player.id}>
                <SettingsRow
                  title={player.displayName}
                  value={color}
                  onPress={() => setEditingPlayer(player)}
                />
                {index < roster.players.length - 1 ? <SettingsDivider /> : null}
              </Fragment>
            );
          })}
        </SettingsGroup>
      </SettingsPage>

      <PlayerIdentityEditor
        visible={editingSelf && !!playerProfile.profile}
        initial={playerProfile.profile ? {
          displayName: playerProfile.profile.displayName,
          identity: playerProfile.profile.identity,
        } : null}
        eyebrow="MY PLAYER"
        title="Make it yours"
        saveLabel="Save my player"
        onClose={() => setEditingSelf(false)}
        onSave={playerProfile.save}
        onPreviewSuccess={(soundId) => { void feedback.success(soundId); }}
        onPreviewFailure={(soundId) => { void feedback.failure(soundId); }}
      />

      <SavedPlayerEditor
        player={editingPlayer}
        onClose={() => setEditingPlayer(null)}
        onSave={(id, name, identity) => {
          roster.rename(id, name);
          roster.updateIdentity(id, identity);
        }}
        onArchive={roster.archive}
        onPreviewSuccess={(soundId) => { void feedback.success(soundId); }}
        onPreviewFailure={(soundId) => { void feedback.failure(soundId); }}
        onUseAsMyPlayer={userId ? playerProfile.save : undefined}
      />
    </>
  );
}
