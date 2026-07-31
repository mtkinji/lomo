import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../../theme';
import { formatMoney } from '../data/moneySnapshot';
import type { MoneyPlanLimitAnswer as Answer } from '../domain/moneyPlanLimitAnswer';

type Props = {
  answer: Answer;
  onExplain: () => void;
  onReview: () => void;
};

export function MoneyPlanLimitAnswer({ answer, onExplain, onReview }: Props) {
  const content = contentFor(answer);
  const review = answer.state === 'needs_one_answer' || answer.state === 'insufficient_meaning';
  const actionLabel = review ? 'Review purchases' : 'How this works';
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.answer}>{content.answer}</Text>
      <Text style={styles.limit}>{content.limit}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        hitSlop={8}
        onPress={review ? onReview : onExplain}
        style={({ pressed }) => [styles.disclosure, pressed ? styles.disclosurePressed : null]}
      >
        <Text style={styles.disclosureText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function contentFor(answer: Answer): { answer: string; limit: string } {
  const percent = answer.facts.livingPercent;
  const limit = answer.limitLine
    ? `Within your ${percent}% living limit of ${formatMoney(answer.limitLine.livingLimitCents)}.`
    : 'Your dollar living limit is not available yet.';
  switch (answer.state) {
    case 'supported':
      return { answer: `${formatMoney(roundToDollar(answer.headlineAmountCents ?? 0))} left for flexible spending`, limit };
    case 'estimated':
      return { answer: `About ${formatMoney(roundToTenDollars(answer.headlineAmountCents ?? 0))} left for flexible spending`, limit };
    case 'no_flexible_room':
      return { answer: `Your protected plan uses the full ${percent}% living limit`, limit };
    case 'over_limit':
      return { answer: `Your plan is ${formatMoney(answer.headlineAmountCents ?? 0)} over its ${percent}% living limit`, limit };
    case 'over_flexible_room':
      return { answer: `Flexible spending is ${formatMoney(answer.headlineAmountCents ?? 0)} beyond the room in your living limit`, limit };
    case 'unassigned':
      return { answer: `${formatMoney(answer.headlineAmountCents ?? 0)} of your living limit is not assigned yet`, limit };
    case 'stale':
      return { answer: 'Your spending answer needs a refresh', limit: freshnessLine(answer.facts.resourceBasisUpdatedAtIso) };
    case 'needs_one_answer':
      return {
        answer: 'Kwilt needs one answer',
        limit: `${countWord(answer.reviewTransactionIds.length)} ${answer.reviewTransactionIds.length === 1 ? 'purchase could' : 'purchases could'} change what is left inside your ${percent}% living limit.`,
      };
    case 'insufficient_meaning':
      return { answer: 'Kwilt needs more transaction detail', limit: `Review uncertain purchases before relying on your ${percent}% living limit.` };
    case 'missing_income_basis':
      return { answer: 'Kwilt needs your monthly income', limit: 'Your dollar living limit is not available yet.' };
  }
}

function freshnessLine(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Refresh connected accounts to calculate it again.';
  return `Last supported by data from ${new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`;
}

function roundToTenDollars(cents: number): number {
  return Math.round(cents / 1000) * 1000;
}

function roundToDollar(cents: number): number {
  return Math.round(cents / 100) * 100;
}

function countWord(count: number): string {
  if (count === 1) return 'One';
  if (count === 2) return 'Two';
  return String(count);
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  answer: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  limit: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  disclosure: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', marginTop: spacing.xs },
  disclosurePressed: { opacity: 0.62 },
  disclosureText: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
