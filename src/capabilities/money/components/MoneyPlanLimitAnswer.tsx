import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
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
  const actionLabel = 'See monthly plan';
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.answer}>{content.headline}</Text>
      <Text style={styles.limit}>{content.support}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        hitSlop={8}
        onPress={onExplain}
        style={({ pressed }) => [styles.disclosure, pressed ? styles.disclosurePressed : null]}
      >
        <Text style={styles.disclosureText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  answer: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  limit: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  disclosure: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', marginTop: spacing.xs },
  disclosurePressed: { opacity: 0.62 },
  disclosureText: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  recoveryCard: { gap: spacing.sm },
  recoveryTitle: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, fontWeight: '700' },
});
