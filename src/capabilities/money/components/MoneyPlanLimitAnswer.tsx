import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { formatMoney } from '../data/moneySnapshot';
import { formatMoneyPlanLimitAnswer, type MoneyPlanLimitAnswer as Answer } from '../domain/moneyPlanLimitAnswer';

type Props = {
  answer: Answer;
  freshness: string;
  onExplain: () => void;
  onReviewIncome: () => void;
};

export function MoneyPlanLimitAnswer({ answer, freshness, onExplain, onReviewIncome }: Props) {
  const content = formatMoneyPlanLimitAnswer(answer, freshness);
  if (answer.state === 'missing_income_basis') {
    const actionLabel = 'Finish plan';
    return (
      <View testID="money-limit-recovery-card">
        <Card elevation="none" marginVertical={0} padding="sm" style={styles.recoveryCard}>
          <Text accessibilityRole="header" style={styles.recoveryTitle}>{content.headline}</Text>
          <Text style={styles.limit}>{content.support}</Text>
          <Button
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            fullWidth
            onPress={onReviewIncome}
            size="sm"
            variant="primary"
          >
            {actionLabel}
          </Button>
        </Card>
      </View>
    );
  }
  const actionLabel = 'What’s included?';
  const compact = compactAnswer(answer, content);
  const displayAmount = splitCurrencyAmount(compact.amount);
  return (
    <View testID="money-limit-card" style={styles.answerSection}>
      <View testID="money-limit-header" style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{compact.label}</Text>
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onExplain}
          style={({ pressed }) => [styles.explainAction, pressed ? styles.explainActionPressed : null]}
        >
          <Text style={styles.explainActionText}>{actionLabel}</Text>
        </Pressable>
      </View>
      <Card elevation="none" marginVertical={0} padding="sm" style={styles.answerCard}>
        <View
          accessible
          accessibilityLabel={[compact.amount, compact.status].filter(Boolean).join(' ')}
          accessibilityRole="header"
          testID="money-limit-amount-row"
          style={styles.amountRow}
        >
          <View style={styles.amountValueRow}>
            {displayAmount.currency ? (
              <Text
                testID="money-limit-currency-symbol"
                style={[styles.currencySymbol, compact.isOver ? styles.answerOver : null]}
              >
                {displayAmount.currency}
              </Text>
            ) : null}
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              testID="money-limit-amount-number"
              style={[styles.answer, compact.isOver ? styles.answerOver : null]}
            >
              {displayAmount.number}
            </Text>
          </View>
          {compact.status ? (
            <Text style={[styles.amountStatus, compact.isOver ? styles.answerOver : null]}>{compact.status}</Text>
          ) : null}
        </View>
        <Text style={styles.limit}>{compact.support}</Text>
      </Card>
    </View>
  );
}

function splitCurrencyAmount(amount: string): { currency: string | null; number: string } {
  const match = amount.match(/^([$€£])(.*)$/);
  return match ? { currency: match[1], number: match[2] } : { currency: null, number: amount };
}

function compactAnswer(answer: Answer, fallback: { headline: string; support: string }): {
  label: string;
  amount: string;
  status: string | null;
  support: string;
  isOver: boolean;
} {
  const { facts } = answer;
  if (answer.state === 'over_limit') {
    return {
      label: 'Monthly plan this month',
      amount: formatMoney(Math.abs(answer.headlineAmountCents ?? facts.overLimitCents)),
      status: 'over limit',
      support: `Your ${facts.livingPercent}% living limit is ${formatMoney(facts.livingLimitCents ?? 0)}`,
      isOver: true,
    };
  }
  if (answer.state === 'no_flexible_room') {
    return { label: 'Flexible spending', amount: '$0', status: 'left', support: 'Protected costs use your full living limit', isOver: false };
  }
  if (answer.state === 'needs_one_answer' || answer.state === 'insufficient_meaning') {
    return { label: 'Monthly plan this month', amount: 'Update unavailable', status: null, support: fallback.support, isOver: false };
  }
  const room = facts.flexibleRoomCents ?? answer.headlineAmountCents ?? 0;
  const hasCapacity = facts.flexibleCapacityCents != null;
  return {
    label: 'Flexible spending',
    amount: formatMoney(Math.abs(room)),
    status: room < 0 ? 'over' : 'left',
    support: hasCapacity
      ? `out of ${formatMoney(facts.flexibleCapacityCents!)}`
      : fallback.support,
    isOver: room < 0,
  };
}

const styles = StyleSheet.create({
  answerSection: { gap: spacing.xs },
  answerCard: { gap: spacing.xs },
  sectionHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  amountValueRow: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start' },
  currencySymbol: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, fontWeight: '800', marginTop: 2 },
  answer: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 42, lineHeight: 46, fontWeight: '800', letterSpacing: -1.2 },
  amountStatus: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22, fontWeight: '600', marginBottom: 4 },
  answerOver: { color: colors.destructive },
  explainAction: { paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: 6 },
  explainActionPressed: { backgroundColor: colors.fieldFillPressed },
  explainActionText: { color: colors.pine700, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  limit: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  recoveryCard: { gap: spacing.sm },
  recoveryTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, fontWeight: '700' },
});
