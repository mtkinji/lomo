import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { Heading, Text } from '../../../ui/Typography';
import { formatMoney, formatMoneyFreshness } from '../data/moneySnapshot';
import { useMoneyData } from '../data/MoneyDataContext';
import type { MoneyStackParamList } from '../navigation/types';
import type { MoneyPlaceRouteName } from '../navigation/types';
import { MoneyScreenFrame } from './MoneyScreenFrame';

export function MoneySummaryScreen({ navigation }: NativeStackScreenProps<MoneyStackParamList, 'MoneySummary'>) {
  const { snapshot } = useMoneyData();

  return (
    <MoneyScreenFrame
      activePlace="MoneySummary"
      onSelectPlace={(place) => (navigation.navigate as (route: MoneyPlaceRouteName) => void)(place)}
      title="Money"
    >
      {snapshot ? (
        <>
          <View style={styles.hero}>
            <Text variant="label" tone="secondary">Left in {snapshot.periodLabel}</Text>
            <Heading variant="xl">{formatMoney(snapshot.totals.remainingCents)}</Heading>
            <Text tone="secondary">
              {formatMoney(snapshot.totals.spentCents)} spent of {formatMoney(snapshot.totals.plannedCents)} planned
            </Text>
            <Text tone="muted">{formatMoneyFreshness(snapshot.lastSyncedAt)}</Text>
          </View>

          {snapshot.totals.needsReviewCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('MoneyTransactions')}
              style={styles.reviewCard}
            >
              <Text variant="label">{snapshot.totals.needsReviewCount} {snapshot.totals.needsReviewCount === 1 ? 'transaction needs' : 'transactions need'} review</Text>
              <Text tone="secondary">Open Transactions to see what is not assigned.</Text>
            </Pressable>
          ) : null}

          <View style={styles.sectionHeader}>
            <Heading variant="sm">Categories</Heading>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('MoneyCategoryCreate')}>
              <Text variant="label" tone="accent">Add category</Text>
            </Pressable>
          </View>

          {snapshot.categories.length === 0 ? (
            <View style={styles.emptyCard}>
              <Heading variant="sm">No Money plan yet</Heading>
              <Text tone="secondary">Your saved categories will appear here when a Money plan exists.</Text>
            </View>
          ) : snapshot.categories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`${category.name}, ${formatMoney(category.spentCents)} spent of ${formatMoney(category.plannedCents)}`}
              onPress={() => navigation.navigate('MoneyCategoryDetail', { categoryId: category.id })}
              style={({ pressed }) => [styles.categoryCard, pressed ? styles.pressed : null]}
            >
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Heading variant="sm">{category.name}</Heading>
                  <Text tone="secondary">{formatMoney(category.spentCents)} of {formatMoney(category.plannedCents)}</Text>
                </View>
                <Text variant="label">{formatMoney(category.remainingCents)} left</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: category.accentColor,
                      width: `${Math.min(100, Math.max(0, category.percentUsed))}%`,
                    },
                  ]}
                />
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
    </MoneyScreenFrame>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reviewCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.fieldFill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  categoryCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, justifyContent: 'space-between' },
  flex: { flex: 1, gap: 2 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.shellAlt },
  fill: { height: '100%', borderRadius: 4 },
  pressed: { opacity: 0.72 },
});
