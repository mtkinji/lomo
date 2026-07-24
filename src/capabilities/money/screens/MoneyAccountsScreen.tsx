import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoneyFreshness } from '../data/moneySnapshot';
import type { MoneyStackParamList } from '../navigation/types';
import type { MoneyPlaceRouteName } from '../navigation/types';
import { MoneyScreenFrame } from './MoneyScreenFrame';

export function MoneyAccountsScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneyAccounts'>) {
  const { snapshot } = useMoneyData();
  return (
    <MoneyScreenFrame
      activePlace="MoneyAccounts"
      onSelectPlace={(place) => (navigation.navigate as (route: MoneyPlaceRouteName) => void)(place)}
      title="Accounts"
    >
      {snapshot?.accounts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Heading variant="sm">No connected accounts</Heading>
          <Text tone="secondary">Account connection stays unavailable until the later Plaid integration slice.</Text>
        </View>
      ) : snapshot?.accounts.map((account) => (
        <Pressable
          key={account.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('MoneyTransactions', { accountId: account.id })}
          style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
        >
          <View style={styles.flex}>
            <Heading variant="sm" numberOfLines={1}>{account.name}</Heading>
            <Text tone="secondary">{account.institutionName}{account.mask ? ` · •••• ${account.mask}` : ''}</Text>
            <Text tone="muted">{formatMoneyFreshness(account.lastSyncedAt)}</Text>
          </View>
          <View style={styles.trailing}>
            <Text variant="label">{account.transactionCount}</Text>
            <Text tone="secondary">transactions</Text>
          </View>
        </Pressable>
      ))}
    </MoneyScreenFrame>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    gap: spacing.xs, padding: spacing.lg, borderRadius: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  flex: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end' },
  pressed: { opacity: 0.72 },
});
