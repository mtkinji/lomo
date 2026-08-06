import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import type { SavingsOption } from '../domain/savingsContracts';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export function SavingsOptionCard({ option, onPress }: { option: SavingsOption; onPress: () => void }) {
  const member = option.evidence.some((entry) => entry.memberRequired);
  const activated = option.evidence.some((entry) => entry.state === 'activated' || entry.state === 'redeemed');
  return <View style={styles.card} accessibilityLabel={`${option.title}, estimated save ${money(option.predictedSavingsCents)}`}>
    <View style={styles.row}><View style={styles.grow}><Heading variant="sm">{option.title}</Heading><Text tone="secondary">{option.quantity} package{option.quantity === 1 ? '' : 's'} · {option.store}</Text></View><Heading variant="sm">{money(option.netCents)}</Heading></View>
    <Text>Estimated save {money(option.predictedSavingsCents)}</Text>
    {member ? <Text tone="secondary">{option.store} membership required.</Text> : null}
    <Text tone="secondary">Observed {new Date(option.evidenceObservedAt).toLocaleDateString()}{option.expiresAt ? ` · Expires ${new Date(option.expiresAt).toLocaleDateString()}` : ''}</Text>
    {option.assumptions.map((assumption) => <Text key={assumption} tone="secondary">{assumption}</Text>)}
    {activated ? <Text>Applied by retailer acknowledgement</Text> : <Button variant="outline" onPress={onPress}>{option.nextAction}</Button>}
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, gap: spacing.sm }, row: { flexDirection: 'row', gap: spacing.sm }, grow: { flex: 1, gap: 2 } });
