import { Pressable } from '@/src/ui/HapticPressable';
import { Pencil, Plus, Trophy } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { normalizePlayerIdentity, playerColor, playerColorText } from './playerIdentity';
import type { SavedPlayer } from './savedPlayers';
import type { GamePlayerProfile } from './gamePlayerProfile';

type Props = {
  players: SavedPlayer[];
  selectedIds: ReadonlySet<string>;
  onToggle: (player: SavedPlayer) => void;
  onEdit?: (player: SavedPlayer) => void;
  selfProfile?: GamePlayerProfile | null;
  selfSelected?: boolean;
  onToggleSelf?: (profile: GamePlayerProfile) => void;
  onEditSelf?: () => void;
  onAdd?: () => void;
  addDisabled?: boolean;
  personalBestFor?: (player: SavedPlayer | GamePlayerProfile) => number | null;
};

export function SavedPlayerPicker({ players, selectedIds, onToggle, onEdit, selfProfile, selfSelected = false, onToggleSelf, onEditSelf, onAdd, addDisabled = false, personalBestFor }: Props) {
  if (!players.length && !selfProfile && !onAdd) return null;
  const personalBests = [
    ...(selfProfile ? [{ key: `self-${selfProfile.userId}`, displayName: selfProfile.displayName, score: personalBestFor?.(selfProfile) ?? null }] : []),
    ...players.map((player) => ({ key: player.id, displayName: player.displayName, score: personalBestFor?.(player) ?? null })),
  ].filter((entry): entry is typeof entry & { score: number } => entry.score != null);

  return <View style={styles.remembered}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {selfProfile && onToggleSelf ? <View style={[styles.chip, { backgroundColor: playerColor(selfProfile.identity.colorId) }, selfSelected ? styles.chipSelected : null]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`You, ${selfProfile.displayName}${selfSelected ? ', selected' : ''}`} hitSlop={4} onPress={() => onToggleSelf(selfProfile)} style={styles.select}>
          <Text style={[styles.youLabel, { color: playerColorText(selfProfile.identity.colorId) }]}>YOU</Text>
          <Text style={[styles.chipText, { color: playerColorText(selfProfile.identity.colorId) }, selfSelected ? styles.chipTextSelected : null]}>{selfProfile.displayName}</Text>
        </Pressable>
        {onEditSelf ? <Pressable accessibilityRole="button" accessibilityLabel="Edit my player" hitSlop={4} onPress={onEditSelf} style={styles.edit}><Pencil size={13} color={playerColorText(selfProfile.identity.colorId)} /></Pressable> : null}
      </View> : null}
      {players.map((player) => {
        const selected = selectedIds.has(player.id);
        const identity = normalizePlayerIdentity(player.identity);
        return <View key={player.id} style={[styles.chip, { backgroundColor: playerColor(identity.colorId) }, selected ? styles.chipSelected : null]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${player.displayName}${selected ? ', selected' : ''}`}
            accessibilityHint="Tap to select."
            hitSlop={4}
            onPress={() => onToggle(player)}
            style={styles.select}
          ><Text style={[styles.chipText, { color: playerColorText(identity.colorId) }, selected ? styles.chipTextSelected : null]}>{player.displayName}</Text></Pressable>
          {onEdit ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${player.displayName}`} hitSlop={4} onPress={() => onEdit(player)} style={styles.edit}><Pencil size={13} color={playerColorText(identity.colorId)} /></Pressable> : null}
        </View>;
      })}
      {onAdd ? <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add player"
        accessibilityState={{ disabled: addDisabled }}
        disabled={addDisabled}
        hitSlop={4}
        onPress={onAdd}
        style={({ pressed }) => [styles.add, addDisabled ? styles.addDisabled : null, pressed ? styles.addPressed : null]}
      ><Plus size={19} color={gamesTheme.colors.ink} /></Pressable> : null}
    </ScrollView>
    {personalBests.length ? <View accessible accessibilityLabel={`Personal bests: ${personalBests.map((entry) => `${entry.displayName}, ${entry.score}`).join('; ')}`} style={styles.bests}>
      <Trophy size={13} color="rgba(32,29,24,0.56)" />
      <Text style={styles.bestsLabel}>PERSONAL BESTS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bestsScroll} contentContainerStyle={styles.bestEntries}>
        {personalBests.map((entry) => <View key={entry.key} style={styles.bestEntry}>
          <Text style={styles.bestName}>{entry.displayName}</Text>
          <Text style={styles.bestScore}>{entry.score.toLocaleString()}</Text>
        </View>)}
      </ScrollView>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  remembered: { gap: 5 },
  chips: { gap: 8, paddingHorizontal: 4, paddingVertical: 4 },
  chip: { minHeight: 36, flexDirection: 'row', alignItems: 'stretch', borderRadius: gamesTheme.radius.pill, borderWidth: 1, borderColor: 'rgba(32,29,24,0.2)', overflow: 'hidden' },
  chipSelected: { borderColor: gamesTheme.colors.ink, borderWidth: 3 },
  select: { minHeight: 36, justifyContent: 'center', paddingVertical: 5, paddingLeft: 12, paddingRight: 7 },
  edit: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: gamesTheme.type.utility, color: gamesTheme.colors.ink, fontSize: 12 },
  chipTextSelected: { fontFamily: gamesTheme.type.display },
  youLabel: { fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 1.1, opacity: 0.62 },
  add: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(32,29,24,0.22)', backgroundColor: 'rgba(255,255,255,0.32)' },
  addDisabled: { opacity: 0.34 },
  addPressed: { backgroundColor: 'rgba(32,29,24,0.07)', transform: [{ scale: 0.96 }] },
  bests: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 7 },
  bestsLabel: { fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 0.9, color: 'rgba(32,29,24,0.5)' },
  bestsScroll: { flex: 1 },
  bestEntries: { alignItems: 'center', gap: 12, paddingRight: 8 },
  bestEntry: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bestName: { fontFamily: gamesTheme.type.body, fontSize: 10, color: 'rgba(32,29,24,0.62)' },
  bestScore: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: gamesTheme.colors.ink },
});
