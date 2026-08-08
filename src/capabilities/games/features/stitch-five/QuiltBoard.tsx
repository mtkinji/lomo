import { Pressable, StyleSheet, Text as NativeText, View, type TextProps } from 'react-native';
import { stitchFiveScorecard, stitchFiveTotals, type StitchFiveCategoryId, type StitchFivePlayer, type StitchFiveScores, type StitchFiveTone } from '@/src/capabilities/games/domain/stitch-five';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';

const toneStyles: Record<StitchFiveTone, { backgroundColor: string; borderColor: string }> = {
  rose: { backgroundColor: '#F5C1BD', borderColor: '#B76D6A' },
  coral: { backgroundColor: '#F4B28C', borderColor: '#B96F4C' },
  gold: { backgroundColor: '#F1D27A', borderColor: '#A98931' },
  pine: { backgroundColor: '#93C6A4', borderColor: '#4E8561' },
  sky: { backgroundColor: '#8FC4D7', borderColor: '#4D8295' },
  violet: { backgroundColor: '#B7A4D5', borderColor: '#756197' },
};
const Text = (props: TextProps) => <NativeText maxFontSizeMultiplier={1.35} {...props} />;

type Props = {
  player: StitchFivePlayer;
  previews?: StitchFiveScores;
  selectedCategory?: StitchFiveCategoryId | null;
  onSelect?: (category: StitchFiveCategoryId) => void;
  compact?: boolean;
};

export function QuiltBoard({ player, previews = {}, selectedCategory, onSelect, compact = false }: Props) {
  const totals = stitchFiveTotals(player.scores);
  return <View>
    <View style={styles.grid}>
      {stitchFiveScorecard.map((patch) => {
        const score = player.scores[patch.id];
        const used = score !== undefined;
        const preview = previews[patch.id];
        const available = preview !== undefined && !!onSelect;
        const selected = selectedCategory === patch.id;
        return <Pressable
          key={patch.id}
          accessibilityRole={available ? 'button' : 'text'}
          accessibilityLabel={used
            ? `${patch.label}, stitched for ${score}`
            : available
              ? `${patch.label}, would score ${preview}`
              : `${patch.label}, open`}
          accessibilityHint={available ? 'Selects this patch to stitch and end the turn' : undefined}
          accessibilityState={available ? { selected } : undefined}
          disabled={!available}
          onPress={() => onSelect?.(patch.id)}
          style={[
            styles.patch,
            compact ? styles.patchCompact : null,
            used ? toneStyles[patch.tone] : styles.patchOpen,
            available ? styles.patchAvailable : null,
            selected ? styles.patchSelected : null,
          ]}
        >
          <View pointerEvents="none" style={styles.seam} />
          <View style={styles.patchCopy}>
            <Text numberOfLines={1} style={styles.patchLabel}>{patch.label}</Text>
            {!compact ? <Text numberOfLines={2} style={styles.patchRule}>{used ? 'STITCHED' : patch.rule}</Text> : null}
          </View>
          <View style={[styles.score, used ? styles.scoreFilled : null]}>
            <Text style={styles.scoreText}>{used ? score : preview !== undefined ? preview : patch.mark}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    <View accessibilityLabel={`Face patterns ${totals.faceSubtotal} of 63. Seam bonus ${totals.seamBonus ? 'earned' : 'not yet earned'}.`} style={[styles.bonus, totals.seamBonus ? styles.bonusEarned : null]}>
      <View><Text style={styles.bonusTitle}>Seam Bonus</Text><Text style={styles.bonusRule}>Face patterns · 63 needed</Text></View>
      <Text style={styles.bonusScore}>{totals.seamBonus ? '+35' : `${totals.faceSubtotal}/63`}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  patch: { width: '48.7%', minHeight: 72, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 16, borderWidth: 1.5 },
  patchCompact: { minHeight: 58 },
  patchOpen: { backgroundColor: 'rgba(255,249,237,0.52)', borderColor: 'rgba(32,29,24,0.2)', borderStyle: 'dashed' },
  patchAvailable: { backgroundColor: gamesTheme.colors.paper, borderStyle: 'solid', borderColor: 'rgba(32,29,24,0.34)' },
  patchSelected: { borderWidth: 3, borderColor: gamesTheme.colors.ink, padding: 8.5 },
  seam: { position: 'absolute', top: 5, right: 5, bottom: 5, left: 5, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.48)', borderRadius: 11 },
  patchCopy: { flex: 1, zIndex: 1 },
  patchLabel: { fontFamily: gamesTheme.type.display, fontSize: 13, color: gamesTheme.colors.ink },
  patchRule: { marginTop: 2, fontFamily: gamesTheme.type.body, fontSize: 8, lineHeight: 10, color: 'rgba(32,29,24,0.58)' },
  score: { zIndex: 1, minWidth: 30, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(32,29,24,0.07)' },
  scoreFilled: { backgroundColor: 'rgba(255,255,255,0.45)' },
  scoreText: { fontFamily: gamesTheme.type.display, fontSize: 14, color: gamesTheme.colors.ink },
  bonus: { minHeight: 58, marginTop: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(32,29,24,0.18)', backgroundColor: 'rgba(255,249,237,0.55)' },
  bonusEarned: { backgroundColor: '#F1D27A', borderColor: '#A98931' },
  bonusTitle: { fontFamily: gamesTheme.type.display, fontSize: 14, color: gamesTheme.colors.ink },
  bonusRule: { fontFamily: gamesTheme.type.body, fontSize: 9, color: 'rgba(32,29,24,0.56)' },
  bonusScore: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
});
