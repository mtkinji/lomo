import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { Text } from '../../../ui/primitives';
import {
  compactFamilyScreenTimeCriteria,
  type FamilyScreenTimeAgreementSummary,
  type FamilyScreenTimeNextAction,
} from './familyScreenTimePresentation';

type Props = {
  summary: FamilyScreenTimeAgreementSummary;
  onAction: () => void;
};

function actionLabelFor(action: FamilyScreenTimeNextAction): string | null {
  switch (action) {
    case 'continue_setup': return 'Continue setup';
    case 'activate': return 'Turn on';
    case 'edit': return 'Edit';
    case 'recover': return 'Fix device';
    case 'none':
    default: return null;
  }
}

export function FamilyScreenTimeAgreementCard({ summary, onAction }: Props) {
  const actionLabel = actionLabelFor(summary.nextAction);
  const needsAttention = summary.lifecycle === 'needs_attention';

  return (
    <View
      accessibilityLabel={`${summary.childDisplayName} Screen Time agreement`}
      style={[styles.card, needsAttention ? styles.attentionCard : null]}
    >
      <View style={styles.copy}>
        <Text selectable style={styles.title}>{summary.targetLabel}</Text>
        <Text selectable style={styles.criteria}>{compactFamilyScreenTimeCriteria(summary)}</Text>
        <Text selectable style={styles.explanation}>
          {needsAttention && summary.issue ? summary.issue : summary.childExplanation}
        </Text>
      </View>
      {actionLabel ? (
        <Button
          accessibilityRole="button"
          fullWidth
          onPress={onAction}
          variant={needsAttention ? 'outline' : 'primary'}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  attentionCard: {
    borderColor: colors.turmeric500,
    backgroundColor: colors.turmeric50,
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  criteria: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  explanation: {
    ...typography.body,
    marginTop: spacing.xs,
    color: colors.textPrimary,
  },
});
