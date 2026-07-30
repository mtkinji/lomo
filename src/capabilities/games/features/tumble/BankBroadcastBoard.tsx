import { StyleSheet, Text, View } from 'react-native';
import type { BankGame } from '@/src/capabilities/games/domain/bank';
import { normalizePlayerIdentity, playerColor, playerColorText, type PlayerIdentity } from '@/src/capabilities/games/players/playerIdentity';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { Die } from './Die';
import { BankPot } from './BankPot';

export function BankBroadcastBoard({ game, dice, identities, rolling, compact = false, personalBestLabels = [] }: {
  game: BankGame;
  dice: number[];
  identities: PlayerIdentity[];
  rolling: boolean;
  compact?: boolean;
  personalBestLabels?: (string | null)[];
}) {
  const activePlayer = game.players[game.activePlayer];

  return (
    <View style={[styles.board, compact ? styles.boardCompact : null]}>
      <View style={[styles.standings, compact ? styles.standingsCompact : null]} accessibilityLabel="Player standings">
        <Text style={styles.eyebrow}>STANDINGS</Text>
        <View style={styles.standingList}>
          {game.players.map((player, index) => {
            const identity = normalizePlayerIdentity(identities[index], index);
            const active = index === game.activePlayer && !player.banked && game.status === 'playing';
            const activeColor = playerColor(identity.colorId);
            const activeText = active ? playerColorText(identity.colorId) : gamesTheme.colors.white;
            return (
              <View
                key={player.id}
                accessible
                accessibilityLabel={`${player.name}, ${player.score} points${active ? ', current player' : player.banked && game.status === 'playing' ? ', banked' : ''}${personalBestLabels[index] ? `, ${personalBestLabels[index]}` : ''}`}
                accessibilityState={{ selected: active }}
                style={[
                styles.standingRow,
                compact ? styles.standingRowCompact : null,
                active ? { backgroundColor: activeColor, borderColor: activeColor } : null,
                player.banked && game.status === 'playing' ? styles.standingBanked : null,
              ]}>
                <View style={styles.standingIdentity}>
                  <View style={[styles.playerMarker, { backgroundColor: activeColor }]} />
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.playerName, { color: activeText }]}>{player.name}</Text>
                </View>
                <View style={styles.scoreStack}>
                  <View style={styles.scoreGroup}>
                    {player.banked && game.status === 'playing' ? <Text style={styles.bankedLabel}>BANKED</Text> : null}
                    <Text style={[styles.playerScore, { color: activeText }]}>{player.score}</Text>
                  </View>
                  {personalBestLabels[index] ? <Text style={styles.bestLabel}>{personalBestLabels[index]}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.stage, compact ? styles.stageCompact : null]}>
        <View style={styles.diceTray}>
          {dice.map((value, index) => <Die key={`${index}-${value}-${rolling ? 'rolling' : 'still'}`} value={value} rolling={rolling} large={!compact} />)}
        </View>
        <BankPot pot={game.pot} rollInRound={game.rollInRound} message={game.message} rolling={rolling} mode={compact ? 'compact' : 'broadcast'} />
      </View>

      <View style={[styles.context, compact ? styles.contextCompact : null]} accessibilityLabel="Current turn">
        <Text style={styles.round}>ROUND {game.round} OF {game.maxRounds}</Text>
        <View style={styles.turnBlock}>
          <Text style={styles.eyebrow}>{game.status === 'finished' ? 'FINAL SCORE' : 'CURRENT TURN'}</Text>
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.turnName, compact ? styles.turnNameCompact : null]}>
            {game.status === 'finished' ? game.message : activePlayer?.name}
          </Text>
        </View>
        {game.status === 'playing' ? <Text numberOfLines={compact ? 2 : 3} style={[styles.message, compact ? styles.messageCompact : null]}>{rolling ? 'Dice in motion…' : game.message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 14, gap: 18 },
  boardCompact: { paddingHorizontal: 10, paddingVertical: 8, gap: 10 },
  standings: { flex: 0.9, minWidth: 178, paddingRight: 18, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.14)' },
  standingsCompact: { minWidth: 145, paddingRight: 10 },
  eyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.7, color: 'rgba(255,255,255,0.58)' },
  standingList: { flex: 1, justifyContent: 'center', gap: 6, paddingTop: 7 },
  standingRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(3,30,23,0.32)' },
  standingRowCompact: { minHeight: 29, paddingHorizontal: 7 },
  standingBanked: { opacity: 0.68 },
  standingIdentity: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  playerMarker: { width: 7, height: 7, borderRadius: 4 },
  playerName: { minWidth: 0, flexShrink: 1, fontFamily: gamesTheme.type.utility, fontSize: 12 },
  scoreGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreStack: { alignItems: 'flex-end' },
  bankedLabel: { fontFamily: gamesTheme.type.utility, fontSize: 7, letterSpacing: 0.8, color: 'rgba(255,255,255,0.62)' },
  playerScore: { fontFamily: gamesTheme.type.display, fontSize: 17 },
  bestLabel: { fontFamily: gamesTheme.type.utility, fontSize: 7, letterSpacing: 0.7, color: gamesTheme.colors.turmeric },
  stage: { flex: 1.45, minWidth: 260, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  stageCompact: { minWidth: 205 },
  diceTray: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30 },
  context: { flex: 0.9, minWidth: 178, justifyContent: 'space-between', paddingLeft: 18, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)' },
  contextCompact: { minWidth: 145, paddingLeft: 10 },
  round: { fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.4, color: gamesTheme.colors.turmeric },
  turnBlock: { gap: 5 },
  turnName: { fontFamily: gamesTheme.type.display, fontSize: 28, lineHeight: 31, color: gamesTheme.colors.white },
  turnNameCompact: { fontSize: 23, lineHeight: 25 },
  message: { fontFamily: gamesTheme.type.body, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.68)' },
  messageCompact: { fontSize: 11, lineHeight: 14 },
});
