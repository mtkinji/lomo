import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { useMoneyData } from '../data/MoneyDataContext';
import { formatMoney } from '../data/moneySnapshot';
import type { MoneyStackParamList } from '../navigation/types';

type DetailRouteName = 'MoneyCategoryDetail' | 'MoneyTransactionDetail';

export function MoneyDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<MoneyStackParamList, DetailRouteName>) {
  const { snapshot, status } = useMoneyData();
  const categoryId = 'categoryId' in route.params ? route.params.categoryId : null;
  const transactionId = 'transactionId' in route.params ? route.params.transactionId : null;
  const category = categoryId
    ? snapshot?.categories.find((item) => item.id === categoryId || item.sourceId === categoryId)
    : undefined;
  const transaction = transactionId
    ? snapshot?.transactions.find((item) => item.id === transactionId)
    : undefined;
  const title = category?.name || transaction?.merchantName || (route.name === 'MoneyCategoryDetail' ? 'Category' : 'Transaction');

  return (
    <AppShell>
      <PageHeader title={title} onPressBack={() => navigation.goBack()} />
      {status === 'loading' && !snapshot ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {category ? (
            <>
              <View style={styles.hero}>
                <Text variant="label" tone="secondary">Left this month</Text>
                <Heading variant="xl">{formatMoney(category.remainingCents)}</Heading>
                <Text tone="secondary">{formatMoney(category.spentCents)} spent of {formatMoney(category.plannedCents)}</Text>
              </View>
              <DetailRow label="Transactions" value={String(category.transactionCount)} />
              <DetailRow label="Rollover" value={category.rolloverEnabled ? 'On' : 'Off'} />
              {category.description ? <DetailRow label="About" value={category.description} /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('MoneyTransactions', { categoryId: category.id })}
                style={styles.action}
              >
                <Text variant="label" tone="accent">View category transactions</Text>
              </Pressable>
            </>
          ) : transaction ? (
            <>
              <View style={styles.hero}>
                <Text variant="label" tone="secondary">{transaction.direction === 'outflow' ? 'Spent' : 'Received'}</Text>
                <Heading variant="xl">{formatMoney(transaction.amountCents, transaction.currencyCode)}</Heading>
                <Text tone="secondary">{transaction.pending ? 'Pending' : 'Posted'} {formatDate(transaction.date)}</Text>
              </View>
              <DetailRow label="Category" value={transaction.categoryName} />
              <DetailRow label="Account" value={transaction.accountName} />
              <DetailRow label="Institution" value={transaction.institutionName} />
              <DetailRow label="Meaning" value={formatMeaning(transaction.moneyMeaning, transaction.direction)} />
              <View style={styles.readOnly}>
                <Text variant="label">Read-only</Text>
                <Text tone="secondary">Corrections and matching rules arrive with the first Money write slice.</Text>
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <Heading variant="sm">This Money record is unavailable</Heading>
              <Text tone="secondary" style={styles.centeredText}>It may have changed since the last successful sync.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text tone="secondary">{label}</Text>
      <Text variant="label" style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : date;
}

function formatMeaning(meaning: string | null, direction: 'inflow' | 'outflow'): string {
  if (!meaning || meaning === 'unknown') return direction === 'inflow' ? 'Income or transfer' : 'Spending';
  return meaning.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  centered: {
    flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl,
  },
  centeredText: { textAlign: 'center' },
  hero: {
    gap: spacing.xs, padding: spacing.lg, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg,
    padding: spacing.md, borderRadius: 14, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  rowValue: { flex: 1, textAlign: 'right' },
  action: {
    alignItems: 'center', padding: spacing.md, borderRadius: 14,
    backgroundColor: colors.fieldFill, borderWidth: 1, borderColor: colors.border,
  },
  readOnly: {
    gap: spacing.xs, padding: spacing.md, borderRadius: 14,
    backgroundColor: colors.fieldFill, borderWidth: 1, borderColor: colors.border,
  },
});
