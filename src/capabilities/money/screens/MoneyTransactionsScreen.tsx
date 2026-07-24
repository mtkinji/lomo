import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney } from '../data/moneySnapshot';
import type { MoneyStackParamList } from '../navigation/types';
import type { MoneyPlaceRouteName } from '../navigation/types';
import { MoneyScreenFrame } from './MoneyScreenFrame';

export function MoneyTransactionsScreen({ navigation, route }: NativeStackScreenProps<MoneyStackParamList, 'MoneyTransactions'>) {
  const { snapshot } = useMoneyData();
  const accountId = route.params?.accountId;
  const categoryId = route.params?.categoryId;
  const reviewState = route.params?.reviewState;
  const transactions = (snapshot?.transactions ?? []).filter(
    (transaction) =>
      (!accountId || transaction.accountId === accountId) &&
      (!categoryId || transaction.categoryId === categoryId) &&
      (!reviewState || transaction.reviewState === reviewState),
  );
  const filterLabel = accountId
    ? snapshot?.accounts.find((account) => account.id === accountId)?.name
    : categoryId
      ? snapshot?.categories.find((category) => category.id === categoryId)?.name
      : reviewState === 'needs_review'
        ? 'Needs review'
        : reviewState === 'not_counted'
          ? 'Not counted'
          : null;

  return (
    <MoneyScreenFrame
      activePlace="MoneyTransactions"
      onSelectPlace={(place) => (navigation.navigate as (route: MoneyPlaceRouteName) => void)(place)}
      title="Transactions"
    >
      {filterLabel ? (
        <View style={styles.filterCard}>
          <View style={styles.flex}>
            <Text variant="label">Filtered by {filterLabel}</Text>
            <Text tone="secondary">{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => navigation.setParams({ accountId: undefined, categoryId: undefined, reviewState: undefined })}>
            <Text variant="label" tone="accent">Clear</Text>
          </Pressable>
        </View>
      ) : null}

      {snapshot && transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Heading variant="sm">No transactions here</Heading>
          <Text tone="secondary">There are no synced transactions for this view.</Text>
        </View>
      ) : transactions.map((transaction) => {
        const signedAmount = transaction.direction === 'outflow' ? -transaction.amountCents : transaction.amountCents;
        return (
          <Pressable
            key={transaction.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate('MoneyTransactionDetail', { transactionId: transaction.id })}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            <View style={styles.flex}>
              <Heading variant="sm" numberOfLines={1}>{transaction.merchantName}</Heading>
              <Text tone="secondary" numberOfLines={1}>{transaction.categoryName} · {transaction.accountName}</Text>
              <Text tone="muted">{formatDate(transaction.date)}{transaction.pending ? ' · Pending' : ''}</Text>
            </View>
            <Text variant="label" style={transaction.direction === 'inflow' ? styles.inflow : null}>
              {signedAmount > 0 ? '+' : ''}{formatMoney(signedAmount, transaction.currencyCode)}
            </Text>
          </Pressable>
        );
      })}
    </MoneyScreenFrame>
  );
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: parsed.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
    : date;
}

const styles = StyleSheet.create({
  filterCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: 16, backgroundColor: colors.fieldFill, borderWidth: 1, borderColor: colors.border,
  },
  emptyCard: {
    gap: spacing.xs, padding: spacing.lg, borderRadius: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  flex: { flex: 1, gap: 2 },
  inflow: { color: colors.success },
  pressed: { opacity: 0.72 },
});
