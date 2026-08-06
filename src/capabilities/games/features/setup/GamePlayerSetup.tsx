import { useState } from 'react';
import { Play, Plus, Smartphone, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BankingRule } from '@/src/capabilities/games/domain/bank';
import type { GamePlayerProfile } from '@/src/capabilities/games/players/gamePlayerProfile';
import { normalizePlayerIdentity, type FailureSoundId, type PlayerIdentity, type SuccessSoundId } from '@/src/capabilities/games/players/playerIdentity';
import { archiveSeatSelection, renameSeatSelection, toggleProfileSeat, toggleSavedPlayerSeat, type PlayerSeat } from '@/src/capabilities/games/players/playerSeats';
import { SavedPlayerEditor } from '@/src/capabilities/games/players/SavedPlayerEditor';
import { SavedPlayerPicker } from '@/src/capabilities/games/players/SavedPlayerPicker';
import type { SavedPlayer } from '@/src/capabilities/games/players/savedPlayers';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { KwiltSwitch } from '@/src/capabilities/games/ui/KwiltSwitch';

export type { PlayerSeat as SetupSeat } from '@/src/capabilities/games/players/playerSeats';

type SetupMode = 'bank' | 'farkle' | 'connection' | 'remote-only';

type Props = {
  mode: SetupMode;
  seats: PlayerSeat[];
  savedPlayers: SavedPlayer[];
  loading: boolean;
  onChange: (seats: PlayerSeat[]) => void;
  onRename: (id: string, name: string) => void;
  onIdentityChange: (id: string, identity: PlayerIdentity) => void;
  onArchive: (id: string) => void;
  onPreviewSuccess: (soundId: SuccessSoundId) => void;
  onPreviewFailure: (soundId: FailureSoundId) => void;
  createSeat: () => PlayerSeat;
  onStart?: () => void;
  startLabel?: string;
  onLearn?: () => void;
  bankingRule?: BankingRule;
  onBankingRuleChange?: (rule: BankingRule) => void;
  onUseMorePhones?: () => void;
  remoteStarting?: boolean;
  remoteError?: string | null;
  remoteCapacity?: number;
  selfProfile?: GamePlayerProfile | null;
  onEditSelf?: () => void;
  onUseAsMyPlayer?: (name: string, identity: PlayerIdentity) => void;
  personalBestFor?: (player: SavedPlayer | GamePlayerProfile) => number | null;
  minPlayers?: number;
  maxPlayers?: number;
};

export function GamePlayerSetup({
  mode,
  seats,
  savedPlayers,
  loading,
  onChange,
  onRename,
  onIdentityChange,
  onArchive,
  onPreviewSuccess,
  onPreviewFailure,
  createSeat,
  onStart,
  startLabel = 'Start game',
  onLearn,
  bankingRule = 'anyone',
  onBankingRuleChange,
  onUseMorePhones,
  remoteStarting,
  remoteError,
  remoteCapacity = 6,
  selfProfile,
  onEditSelf,
  onUseAsMyPlayer,
  personalBestFor,
  minPlayers: requestedMinPlayers,
  maxPlayers: requestedMaxPlayers,
}: Props) {
  const [editing, setEditing] = useState<SavedPlayer | null>(null);
  const [remoteGuidance, setRemoteGuidance] = useState<string | null>(null);
  const minPlayers = mode === 'remote-only' ? 1 : requestedMinPlayers ?? 2;
  const maxPlayers = mode === 'remote-only' ? 1 : requestedMaxPlayers ?? 6;
  const limits = { minSeats: minPlayers, maxSeats: maxPlayers };
  const localPlay = mode !== 'remote-only';
  const valid = !loading && seats.length >= minPlayers && (localPlay || seats.every((seat) => seat.displayName.trim()));
  const namedSeats = seats.filter((seat) => seat.displayName.trim());
  const resolvedStartLabel = startLabel === 'Start game' && namedSeats.length === 0 ? 'Play now' : startLabel;
  const remoteValid = !loading && namedSeats.length >= 1 && namedSeats.length < remoteCapacity;
  const selectedIds = new Set(seats.flatMap((seat) => seat.savedPlayerId ? [seat.savedPlayerId] : []));

  const renamePlayer = (id: string, displayName: string) => {
    const clean = displayName.trim();
    onRename(id, clean);
    onChange(renameSeatSelection(seats, id, clean));
  };

  const savePlayer = (id: string, displayName: string, identity: PlayerIdentity) => {
    const clean = displayName.trim();
    onRename(id, clean);
    onIdentityChange(id, identity);
    onChange(seats.map((seat) => seat.savedPlayerId === id ? { ...seat, displayName: clean, identity } : seat));
  };

  const archivePlayer = (id: string) => {
    onArchive(id);
    const nextSeats = archiveSeatSelection(seats, id);
    if (nextSeats !== seats) onChange(nextSeats);
  };

  const toggleSaved = (player: SavedPlayer) => {
    onChange(toggleSavedPlayerSeat(seats, player, createSeat, (seat, selected, index) => ({
      ...seat,
      profileUserId: undefined,
      savedPlayerId: selected.id,
      displayName: selected.displayName,
      identity: normalizePlayerIdentity(selected.identity, index),
    }), limits));
  };

  const useMorePhones = () => {
    if (!remoteValid) {
      setRemoteGuidance(namedSeats.length === 0 ? 'Name the host first.' : 'Remove one player to leave room for another phone.');
      return;
    }
    setRemoteGuidance(null);
    onUseMorePhones?.();
  };

  return <View style={styles.setup}>
    <View style={styles.setupHeading}><Text style={styles.setupTitle}>Who’s playing?</Text></View>

    {!loading ? <SavedPlayerPicker
      players={savedPlayers}
      selectedIds={selectedIds}
      onToggle={toggleSaved}
      onEdit={setEditing}
      selfProfile={selfProfile}
      selfSelected={!!selfProfile && seats.some((seat) => seat.profileUserId === selfProfile.userId)}
      onToggleSelf={selfProfile ? (profile) => onChange(toggleProfileSeat(seats, profile, createSeat, limits)) : undefined}
      onEditSelf={onEditSelf}
      personalBestFor={personalBestFor}
    /> : null}

    <ScrollView style={styles.seatScroll} contentContainerStyle={styles.inputs} keyboardShouldPersistTaps="handled">
      {seats.map((seat, index) => <View key={seat.key} style={[styles.inputWrap, mode === 'remote-only' ? styles.inputWrapSingle : null]}>
        <Text style={styles.inputLabel}>{mode === 'remote-only' ? 'HOST' : `PLAYER ${index + 1}`}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={seat.displayName}
            placeholder={mode === 'remote-only' ? 'Your name' : `Player ${index + 1}`}
            placeholderTextColor="rgba(32,29,24,0.34)"
            maxLength={18}
            onChangeText={(displayName) => onChange(seats.map((item) => item.key === seat.key ? { ...item, savedPlayerId: undefined, profileUserId: undefined, displayName } : item))}
            style={styles.input}
            accessibilityLabel={mode === 'remote-only' ? 'Host player' : `Player ${index + 1}`}
          />
          {seats.length > minPlayers ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove player ${index + 1}`} onPress={() => onChange(seats.filter((item) => item.key !== seat.key))} style={styles.remove}><X size={16} color={gamesTheme.colors.ink} /></Pressable> : null}
        </View>
      </View>)}
      {remoteGuidance && !remoteValid ? <Text accessibilityRole="alert" style={styles.remoteError}>{remoteGuidance}</Text> : null}
      {remoteError ? <Text accessibilityRole="alert" style={styles.remoteError}>{remoteError}</Text> : null}
      <View style={[styles.playerActions, mode === 'remote-only' ? styles.playerActionsRemoteOnly : null]}>
        {mode !== 'remote-only' ? <Pressable accessibilityRole="button" accessibilityLabel="Add player" accessibilityState={{ disabled: seats.length >= maxPlayers }} disabled={seats.length >= maxPlayers} onPress={() => onChange([...seats, createSeat()])} style={({ pressed }) => [styles.playerAction, styles.addPlayerAction, seats.length >= maxPlayers ? styles.playerActionDisabled : null, pressed ? styles.playerActionPressed : null]}><Plus size={17} color={gamesTheme.colors.ink} /><Text style={styles.playerActionLabel}>Add player</Text></Pressable> : null}
        {onUseMorePhones ? <Pressable accessibilityRole="button" accessibilityLabel="Use more phones" accessibilityState={{ disabled: loading || !!remoteStarting || !remoteValid }} disabled={loading || !!remoteStarting || !remoteValid} onPress={useMorePhones} style={({ pressed }) => [styles.playerAction, loading || remoteStarting || !remoteValid ? styles.playerActionDisabled : null, pressed ? styles.playerActionPressed : null]}><Smartphone size={16} color={gamesTheme.colors.ink} /><Text style={styles.playerActionLabel}>{remoteStarting ? 'Opening the table…' : 'Use more phones'}</Text></Pressable> : null}
      </View>
    </ScrollView>

    {mode === 'bank' ? <View style={styles.houseRule}>
      <View style={styles.houseRuleCopy}>
        <Text style={styles.houseRuleTitle}>Anyone can bank at any time</Text>
        <Text style={styles.houseRuleHint}>Select everyone banking after a roll.</Text>
      </View>
      <KwiltSwitch
        value={bankingRule === 'anyone'}
        onPress={() => onBankingRuleChange?.(bankingRule === 'anyone' ? 'turns' : 'anyone')}
        accessibilityLabel="Anyone can bank at any time"
        accessibilityHint="Turn off to limit banking to the current player"
      />
    </View> : null}

    {localPlay ? <Text style={styles.optionalNames}>Names are optional for local play.</Text> : null}
    {mode !== 'remote-only' && onStart ? <GameButton style={styles.startAction} disabled={!valid} onPress={onStart} icon={<Play size={18} fill={gamesTheme.colors.ink} color={gamesTheme.colors.ink} />}>{resolvedStartLabel}</GameButton> : null}
    {mode === 'farkle' && onLearn && valid ? <GameButton tone="ghost" onPress={onLearn}>New to Farkle? Learn in one turn</GameButton> : null}
    <SavedPlayerEditor player={editing} onClose={() => setEditing(null)} onSave={savePlayer} onArchive={archivePlayer} onPreviewSuccess={onPreviewSuccess} onPreviewFailure={onPreviewFailure} onUseAsMyPlayer={onUseAsMyPlayer} />
  </View>;
}

const styles = StyleSheet.create({
  setup: { flex: 1, paddingHorizontal: 4, paddingVertical: 14, gap: 13 },
  setupHeading: { paddingHorizontal: 6 },
  setupTitle: { fontFamily: gamesTheme.type.display, fontSize: 27, color: gamesTheme.colors.ink },
  seatScroll: { minHeight: 0 },
  inputs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 6 },
  inputWrap: { width: '48%', gap: 5 },
  inputWrapSingle: { width: '100%' },
  inputLabel: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.5)', fontSize: 9, letterSpacing: 1.2 },
  inputRow: { height: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(32,29,24,0.2)', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { flex: 1, height: '100%', paddingHorizontal: 13, fontFamily: gamesTheme.type.utility, fontSize: 14, color: gamesTheme.colors.ink },
  remove: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  playerActions: { width: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 1 },
  playerActionsRemoteOnly: { justifyContent: 'flex-end' },
  playerAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: gamesTheme.radius.pill },
  addPlayerAction: { borderWidth: 1, borderColor: 'rgba(32,29,24,0.2)', backgroundColor: 'rgba(255,255,255,0.3)' },
  playerActionLabel: { fontFamily: gamesTheme.type.utility, fontSize: 13, color: gamesTheme.colors.ink },
  playerActionDisabled: { opacity: 0.34 },
  playerActionPressed: { backgroundColor: 'rgba(32,29,24,0.07)', transform: [{ scale: 0.98 }] },
  houseRule: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 8 },
  houseRuleCopy: { flex: 1 },
  houseRuleTitle: { fontFamily: gamesTheme.type.utility, fontSize: 14, color: gamesTheme.colors.ink },
  houseRuleHint: { fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.52)' },
  startAction: { width: '100%' },
  remoteError: { width: '100%', paddingHorizontal: 8, fontFamily: gamesTheme.type.body, fontSize: 11, lineHeight: 15, color: gamesTheme.colors.danger },
  optionalNames: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.52)' },
});
