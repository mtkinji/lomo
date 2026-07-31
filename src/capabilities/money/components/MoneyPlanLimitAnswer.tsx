import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../../theme';
import { formatMoneyPlanLimitAnswer, type MoneyPlanLimitAnswer as Answer } from '../domain/moneyPlanLimitAnswer';

type Props = {
  answer: Answer;
  onExplain: () => void;
  onReview: () => void;
};

export function MoneyPlanLimitAnswer({ answer, onExplain, onReview }: Props) {
  const content = formatMoneyPlanLimitAnswer(answer);
  const review = answer.state === 'needs_one_answer' || answer.state === 'insufficient_meaning';
  const actionLabel = review ? 'Review purchases' : 'How this works';
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.answer}>{content.headline}</Text>
      <Text style={styles.limit}>{content.support}</Text>
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

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  answer: { color: colors.textPrimary, fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  limit: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  disclosure: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', marginTop: spacing.xs },
  disclosurePressed: { opacity: 0.62 },
  disclosureText: { color: colors.pine700, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
