import { StyleSheet, Text, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { normalizePlayerIdentity, playerColor, playerColorText, type PlayerIdentity } from '@/src/capabilities/games/players/playerIdentity';

export function PlayerRail({ players, identities = [], activePlayer, banked = [], personalBestLabels = [] }: { players: { id: number; name: string; score: number }[]; identities?: PlayerIdentity[]; activePlayer: number; banked?: boolean[]; personalBestLabels?: (string | null)[] }) {
  return (
    <View style={styles.rail} accessibilityLabel="Player scores">
      {players.map((player, index) => {
        const active = index === activePlayer && !banked[index];
        const identity = normalizePlayerIdentity(identities[index], index);
        const activeText = active ? { color: playerColorText(identity.colorId) } : null;
        return <View key={player.id} style={[styles.player, active ? [styles.active, { backgroundColor: playerColor(identity.colorId), borderColor: playerColor(identity.colorId) }] : null, banked[index] ? styles.banked : null]}>
          <View style={styles.playerScore}><Text numberOfLines={1} style={[styles.name, activeText]}>{player.name}</Text><Text style={[styles.score, activeText]}>{player.score}</Text></View>
          {personalBestLabels[index] ? <Text style={styles.best}>{personalBestLabels[index]}</Text> : null}
        </View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, paddingHorizontal: 10 },
  player: { minWidth: 72, maxWidth: 120, minHeight: 30, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(3,30,23,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', opacity: 0.65 },
  playerScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  active: { opacity: 1, transform: [{ scale: 1.04 }] },
  banked: { opacity: 0.34 },
  name: { flexShrink: 1, color: gamesTheme.colors.white, fontFamily: gamesTheme.type.utility, fontSize: 11 },
  score: { color: gamesTheme.colors.white, fontFamily: gamesTheme.type.display, fontSize: 12 },
  best: { color: gamesTheme.colors.turmeric, fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 0.6 },
});
