import { Pressable } from '@/src/ui/HapticPressable';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Icon } from '../../../ui/Icon';
import { formatMoneyPlanLimitAnswer, type MoneyPlanLimitAnswer as Answer } from '../domain/moneyPlanLimitAnswer';
import { formatBudgetOverviewMoney } from '../presentation/budgetOverviewMoney';

type Props = {
  answer: Answer;
  freshness: string;
  showHeader?: boolean;
  onAdjustPlan?: () => void;
  onExplain: () => void;
  onReviewIncome: () => void;
  onReviewOverages?: () => void;
};

export function MoneyPlanLimitAnswer({ answer, freshness, showHeader = true, onAdjustPlan, onExplain, onReviewIncome, onReviewOverages }: Props) {
  const [explanationOpen, setExplanationOpen] = useState(false);
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
  const actionLabel = 'About flexible spending';
  const compact = compactAnswer(answer, content);
  const displayAmount = splitCurrencyAmount(compact.amount);
  const amountToneStyle = compact.surfaceTone === 'over'
    ? styles.amountOver
    : compact.surfaceTone === 'watch'
      ? styles.amountWatch
      : null;
  return (
    <View testID="money-limit-card" style={styles.answerSection}>
      {showHeader ? <View testID="money-limit-header" style={styles.conceptBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{compact.label}</Text>
          <Pressable
            accessibilityHint="Explains flexible spending."
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            accessibilityState={{ expanded: explanationOpen }}
            hitSlop={10}
            onPress={() => {
              const next = !explanationOpen;
              setExplanationOpen(next);
              if (next) onExplain();
            }}
            testID="money-limit-explanation-trigger"
            style={({ pressed }) => [styles.explainAction, pressed ? styles.explainActionPressed : null]}
          >
            <Icon name="info" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        {explanationOpen ? (
          <Text style={styles.conceptExplanation}>
            Spending you can adjust month to month, after bills and money set aside.
          </Text>
        ) : null}
      </View> : null}
      <Card
        elevation="none"
        marginVertical={0}
        padding="sm"
        style={[
          styles.answerCard,
          styles.answerCardNeutral,
        ]}
      >
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
                style={[styles.currencySymbol, amountToneStyle]}
              >
                {displayAmount.currency}
              </Text>
            ) : null}
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              testID="money-limit-amount-number"
              style={[styles.answer, amountToneStyle]}
            >
              {displayAmount.number}
            </Text>
          </View>
          {compact.status ? (
            <Text style={[styles.amountStatus, amountToneStyle]}>{compact.status}</Text>
          ) : null}
        </View>
        {compact.support ? <Text style={styles.limit}>{compact.support}</Text> : null}
        {compact.surfaceTone === 'over' && onReviewOverages ? (
          <Button fullWidth onPress={onReviewOverages} size="sm" variant="outline">Review overages</Button>
        ) : null}
      </Card>
      {answer.facts.overLimitCents > 0 ? (
        <View testID="money-plan-target-notice" style={styles.planTargetNotice}>
          <View style={styles.planTargetCopy}>
            <Text style={styles.planTargetTitle}>
              Plan is {formatBudgetOverviewMoney(answer.facts.overLimitCents)} above target
            </Text>
            <Text style={styles.planTargetSupport}>
              {formatBudgetOverviewMoney(answer.facts.plannedCents)} planned · {answer.facts.livingPercent}% target {formatBudgetOverviewMoney(answer.facts.livingLimitCents ?? 0)}
            </Text>
          </View>
          {onAdjustPlan ? (
            <Button accessibilityLabel="Adjust monthly plan" onPress={onAdjustPlan} size="inline" variant="link">
              Adjust plan
            </Button>
          ) : null}
        </View>
      ) : null}
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
  surfaceTone: 'on_track' | 'watch' | 'over' | 'neutral';
} {
  const { facts } = answer;
  if (answer.state === 'no_flexible_room') {
    return { label: 'Flexible spending', amount: '$0', status: 'left', support: 'Protected costs use your full living limit', surfaceTone: 'watch' };
  }
  if (answer.state === 'needs_one_answer' || answer.state === 'insufficient_meaning') {
    return { label: 'Monthly plan this month', amount: 'Update unavailable', status: null, support: fallback.support, surfaceTone: 'neutral' };
  }
  const room = facts.flexibleRoomCents ?? answer.headlineAmountCents ?? 0;
  return {
    label: 'Flexible spending',
    amount: formatBudgetOverviewMoney(Math.abs(room)),
    status: room < 0 ? 'over budget' : 'left',
    support: '',
    surfaceTone: room < 0 ? 'over' : 'on_track',
  };
}

const styles = StyleSheet.create({
  answerSection: { gap: spacing.xs },
  answerCard: { gap: spacing.xs, borderWidth: 0 },
  answerCardNeutral: { backgroundColor: colors.fieldFill },
  conceptBlock: { gap: spacing.xs },
  sectionHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionLabel: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  conceptExplanation: { maxWidth: 330, color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  planTargetNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  planTargetCopy: { minWidth: 0, flex: 1, gap: 2 },
  planTargetTitle: { color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  planTargetSupport: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  amountValueRow: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start' },
  currencySymbol: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, fontWeight: '800', marginTop: 2 },
  answer: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1 },
  amountStatus: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, fontWeight: '600', marginBottom: 3 },
  amountOver: { color: colors.destructive },
  amountWatch: { color: colors.turmeric600 },
  explainAction: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  explainActionPressed: { backgroundColor: colors.fieldFillPressed },
  limit: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  recoveryCard: { gap: spacing.sm },
  recoveryTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, fontWeight: '700' },
});
