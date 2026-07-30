import { Dices } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';

export function KwiltGamesLockup({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <View style={styles.row} accessibilityLabel="Kwilt Games">
      <View style={[styles.mark, { width: compact ? 30 : 38, height: compact ? 30 : 38 }]}>
        <Dices size={compact ? 18 : 22} color={gamesTheme.colors.ink} strokeWidth={2.6} />
      </View>
      <View>
        <Text style={[styles.kwilt, inverse ? styles.inverse : null]}>KWILT</Text>
        <Text style={[styles.games, inverse ? styles.inverseMuted : null]}>GAMES</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { borderRadius: 11, backgroundColor: gamesTheme.colors.coral, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] },
  kwilt: { color: gamesTheme.colors.ink, fontFamily: gamesTheme.type.display, fontSize: 18, letterSpacing: -0.5, lineHeight: 18 },
  games: { color: 'rgba(32,29,24,0.55)', fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 2.2, lineHeight: 12 },
  inverse: { color: gamesTheme.colors.white },
  inverseMuted: { color: 'rgba(255,255,255,0.62)' },
});
