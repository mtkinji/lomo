import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Text } from '../../../ui/Typography';

export function CookProgress({ current, total }: { current: number; total: number }) {
  const percent = total ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
  return <View style={styles.wrap}><View style={styles.row}><Text variant="label" tone="secondary">Step {current} of {total}</Text><Text variant="label" tone="secondary">{Math.round(percent)}%</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View></View>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.xs }, row: { flexDirection: 'row', justifyContent: 'space-between' }, track: { height: 5, borderRadius: 3, backgroundColor: colors.gray200, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.pine700 } });
