import { View, useWindowDimensions } from 'react-native';
import { colors, spacing } from '../../../theme';
import { BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { BottomGuide } from '../../../ui/BottomGuide';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { VStack } from '../../../ui/Stack';
import { Text } from '../../../ui/Typography';
import type { BottomDrawerFooterConfig } from '../../../ui/layout/BottomDrawerSemanticFooter';
import type { ScreenTimeGuideActions } from '../domain/screenTimeGuideActions';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import { useWorkflowFeedbackInlineSlot } from '../../workflow-feedback/WorkflowFeedbackInlineSlot';

const triggerDetails = (rule: ScreenTimeRule): string[] => {
  if (rule.blockingDetails?.length) return rule.blockingDetails;
  if (rule.trigger.type === 'focus_active') return ['Finish or end the current Focus.'];
  if (rule.trigger.type === 'real_step_pending') return ['Complete a to-do, record progress, or finish Focus.'];
  if (rule.trigger.type === 'daily_usage_limit') return ['Wait until tomorrow or change the daily limit.'];
  if (rule.trigger.type === 'composite') return ['Review this rule in Screen Time.'];
  return ['Complete the family agreement.'];
};

export function getScreenTimeGuideLayout(fontScale: number): {
  dynamicSizing: boolean;
  snapPoints: ['72%'] | ['92%'];
} {
  return fontScale >= 1.3
    ? { dynamicSizing: false, snapPoints: ['92%'] }
    : { dynamicSizing: true, snapPoints: ['72%'] };
}

export function ScreenTimeUnlockGuide(props: {
  visible: boolean;
  rules: ScreenTimeRule[];
  actions: ScreenTimeGuideActions;
  unresolvedCount: number;
  feedbackSourceKey?: string;
  onDismiss: () => void;
  onOpenRequirement: () => void;
  onManageRules: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const layout = getScreenTimeGuideLayout(fontScale);
  const feedback = useWorkflowFeedbackInlineSlot(props.feedbackSourceKey);
  const count = props.rules.length + props.unresolvedCount;
  const title = count > 1
    ? `${count} rules are keeping this app paused.`
    : 'This app is paused.';
  const body = props.actions.requiresCaregiver
    ? 'A caregiver can change this rule.'
    : props.actions.resolutionKind === 'actionable'
      ? 'Complete the rule’s requirement to continue.'
      : props.actions.resolutionKind === 'mixed'
        ? 'Each active rule must be satisfied before this app is available.'
        : props.actions.resolutionKind === 'unresolved'
          ? 'Open Screen Time to review the active boundary.'
          : 'This rule stays in place until its condition changes.';
  const footer: BottomDrawerFooterConfig | undefined = (
    props.actions.requirementAction || props.actions.canManageRules
  ) ? {
      ...(props.actions.requirementAction ? {
        primaryAction: {
          label: props.actions.requirementAction.label,
          onPress: props.onOpenRequirement,
        },
      } : {}),
      ...(props.actions.canManageRules ? {
        secondaryAction: {
          label: 'Manage rules ›',
          onPress: props.onManageRules,
          variant: 'link' as const,
        },
      } : {}),
      actionLayout: 'responsive',
    } : undefined;

  return (
    <BottomGuide
      visible={props.visible}
      onClose={props.onDismiss}
      snapPoints={layout.snapPoints}
      dynamicSizing={layout.dynamicSizing}
      scrim="light"
      showDragHandle={false}
      footer={footer}
      contentStyle={!layout.dynamicSizing ? styles.guideBody : undefined}
    >
      <BottomDrawerScrollView
        underlapsHandle={false}
        style={!layout.dynamicSizing ? styles.scroller : undefined}
        contentContainerStyle={styles.content}
      >
        <VStack space={spacing.xs}>
          <BottomDrawerHeader
            variant="withClose"
            title={title}
            onClose={props.onDismiss}
            closeAccessibilityLabel="Close Screen Time guide"
            containerStyle={{ paddingBottom: 0 }}
          />
          <Text tone="secondary">{body}</Text>
        </VStack>

        <VStack space={spacing.sm}>
          {props.rules.map((rule) => (
            <View key={rule.id} style={styles.ruleCard}>
              <Text variant="label">{rule.title}</Text>
              {triggerDetails(rule).map((detail, index) => (
                <Text key={`${rule.id}:${index}`} tone="secondary" style={styles.ruleDetail}>
                  {detail}
                </Text>
              ))}
            </View>
          ))}
          {props.unresolvedCount > 0 ? (
            <View style={styles.ruleCard}>
              <Text variant="label">Another Screen Time rule</Text>
              <Text tone="secondary" style={styles.ruleDetail}>Open the rule in Kwilt to continue.</Text>
            </View>
          ) : null}
        </VStack>

        {feedback}
      </BottomDrawerScrollView>
    </BottomGuide>
  );
}

const styles = {
  guideBody: {
    flex: 1,
    minHeight: 0,
  },
  scroller: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  ruleCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ruleDetail: { marginTop: spacing.xs },
} as const;
