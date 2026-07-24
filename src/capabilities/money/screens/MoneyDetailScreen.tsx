import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
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
  const {
    snapshot,
    status,
    reviewingTransactionId,
    assignTransactionCategory,
    markTransactionNotCounted,
    reviewTransactionMeaning,
    saveMerchantRule,
  } = useMoneyData();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const categoryId = 'categoryId' in route.params ? route.params.categoryId : null;
  const transactionId = 'transactionId' in route.params ? route.params.transactionId : null;
  const category = categoryId
    ? snapshot?.categories.find((item) => item.id === categoryId || item.sourceId === categoryId)
    : undefined;
  const transaction = transactionId
    ? snapshot?.transactions.find((item) => item.id === transactionId)
    : undefined;
  const title = category?.name || transaction?.merchantName || (route.name === 'MoneyCategoryDetail' ? 'Category' : 'Transaction');
  const isSavingReview = Boolean(transaction && reviewingTransactionId === transaction.id);
  const assignedCategory = transaction?.categoryId
    ? snapshot?.categories.find((candidate) => candidate.id === transaction.categoryId)
    : undefined;

  const saveReview = async (mutation: () => Promise<void>) => {
    setReviewError(null);
    try {
      await mutation();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'The transaction could not be updated.');
    }
  };

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
              {transaction.direction === 'outflow' ? (
                <View style={styles.reviewSection}>
                  <View style={styles.reviewHeading}>
                    <Heading variant="sm">Categorize transaction</Heading>
                    <Text tone="secondary">
                      {isSavingReview ? 'Saving…' : 'Choose where this belongs in your monthly plan.'}
                    </Text>
                  </View>
                  {snapshot?.categories.map((candidate) => {
                    const selected = transaction.categoryId === candidate.id;
                    return (
                      <Pressable
                        key={candidate.sourceId}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSavingReview, selected }}
                        disabled={isSavingReview || selected}
                        onPress={() => void saveReview(() =>
                          assignTransactionCategory(transaction.id, candidate.sourceId))}
                        style={[styles.reviewAction, selected && styles.reviewActionSelected]}
                      >
                        <Text variant="label" tone={selected ? 'accent' : 'default'}>{candidate.name}</Text>
                        <Text tone={selected ? 'accent' : 'secondary'}>{selected ? 'Current' : formatMoney(candidate.remainingCents) + ' left'}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSavingReview, selected: transaction.reviewState === 'not_counted' }}
                    disabled={isSavingReview || transaction.reviewState === 'not_counted'}
                    onPress={() => void saveReview(() => markTransactionNotCounted(transaction.id))}
                    style={[styles.reviewAction, transaction.reviewState === 'not_counted' && styles.reviewActionSelected]}
                  >
                    <Text variant="label" tone={transaction.reviewState === 'not_counted' ? 'accent' : 'default'}>Don’t count this</Text>
                    <Text tone={transaction.reviewState === 'not_counted' ? 'accent' : 'secondary'}>
                      {transaction.reviewState === 'not_counted' ? 'Current' : 'Keep it outside the monthly plan'}
                    </Text>
                  </Pressable>
                  {assignedCategory ? (
                    transaction.merchantRuleCategoryId === assignedCategory.id ? (
                      <View style={styles.ruleState}>
                        <Text variant="label">Future matches go to {assignedCategory.name}</Text>
                        <Text tone="secondary">This merchant rule is active.</Text>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSavingReview }}
                        disabled={isSavingReview}
                        onPress={() => void saveReview(() => saveMerchantRule({
                          transactionId: transaction.id,
                          merchantName: transaction.merchantName,
                          categoryId: assignedCategory.sourceId,
                          categoryName: assignedCategory.name,
                        }))}
                        style={styles.ruleAction}
                      >
                        <Text variant="label" tone="accent">Use this category for future matches</Text>
                        <Text tone="secondary">Applies to this exact merchant name.</Text>
                      </Pressable>
                    )
                  ) : null}
                  {reviewError ? <Text tone="destructive">{reviewError}</Text> : null}
                </View>
              ) : (
                <View style={styles.reviewSection}>
                  <View style={styles.reviewHeading}>
                    <Heading variant="sm">Classify money received</Heading>
                    <Text tone="secondary">
                      {isSavingReview ? 'Saving…' : 'Choose how this should affect the monthly plan.'}
                    </Text>
                  </View>
                  {([
                    ['income', 'Household income', 'Available to fund the plan'],
                    ['transfer', 'Transfer', 'Money moved between your accounts'],
                    ['not_counted', 'Don’t count this', 'Keep it outside the monthly plan'],
                  ] as const).map(([meaning, label, description]) => {
                    const selected = transaction.moneyMeaning === meaning;
                    return (
                      <Pressable
                        key={meaning}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSavingReview, selected }}
                        disabled={isSavingReview || selected}
                        onPress={() => void saveReview(() =>
                          reviewTransactionMeaning(transaction.id, { meaning }))}
                        style={[styles.reviewAction, selected && styles.reviewActionSelected]}
                      >
                        <Text variant="label" tone={selected ? 'accent' : 'default'}>{label}</Text>
                        <Text tone={selected ? 'accent' : 'secondary'}>{selected ? 'Current' : description}</Text>
                      </Pressable>
                    );
                  })}
                  <Text variant="label" tone="secondary">Credit a category</Text>
                  {snapshot?.categories.map((candidate) => {
                    const selected = transaction.moneyMeaning === 'category_credit'
                      && transaction.categoryId === candidate.id;
                    return (
                      <Pressable
                        key={candidate.sourceId}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSavingReview, selected }}
                        disabled={isSavingReview || selected}
                        onPress={() => void saveReview(() => reviewTransactionMeaning(
                          transaction.id,
                          { meaning: 'category_credit', categoryId: candidate.sourceId },
                        ))}
                        style={[styles.reviewAction, selected && styles.reviewActionSelected]}
                      >
                        <Text variant="label" tone={selected ? 'accent' : 'default'}>{candidate.name}</Text>
                        <Text tone={selected ? 'accent' : 'secondary'}>
                          {selected ? 'Current' : 'Reduce this category’s spending'}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {reviewError ? <Text tone="destructive">{reviewError}</Text> : null}
                </View>
              )}
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
  reviewSection: { gap: spacing.sm, marginTop: spacing.sm },
  reviewHeading: { gap: spacing.xs },
  reviewAction: {
    gap: spacing.xs, padding: spacing.md, borderRadius: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  reviewActionSelected: { backgroundColor: colors.fieldFill, borderColor: colors.accent },
  ruleState: {
    gap: spacing.xs, padding: spacing.md, borderRadius: 14,
    backgroundColor: colors.fieldFill, borderWidth: 1, borderColor: colors.border,
  },
  ruleAction: {
    gap: spacing.xs, padding: spacing.md, borderRadius: 14,
    backgroundColor: colors.fieldFill, borderWidth: 1, borderColor: colors.accent,
  },
});
