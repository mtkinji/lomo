import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Soup } from 'lucide-react-native';
import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';

export function MealCandidateCard({ title, explanation, selected, onPress }: { title: string; explanation: string; selected: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.card, selected && styles.selected]}><View style={styles.image}>{selected ? <Check color={colors.primaryForeground} size={22} /> : <Soup color={colors.pine700} size={24} />}</View><View style={styles.copy}><Heading variant="sm">{title}</Heading><Text tone="secondary">{explanation}</Text></View><Text variant="label">{selected ? 'ADDED' : 'ADD'}</Text></Pressable>;
}
const styles = StyleSheet.create({ card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 18, backgroundColor: colors.card }, selected: { borderColor: colors.pine700, backgroundColor: colors.pine50 }, image: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 }, copy: { flex: 1, gap: 2 } });
