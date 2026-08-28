import { View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { HStack, VStack } from '../../../ui/Stack';
import { Text } from '../../../ui/Typography';
import type { ScreenTimeGuideActions } from '../domain/screenTimeGuideActions';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import type { TemporaryOpenResult } from '../runtime/openScreenTimeRulesTemporarily';

const triggerDetail = (rule: ScreenTimeRule): string => {
  if (rule.trigger.type === 'focus_active') return 'Finish or end the current Focus.';
  if (rule.trigger.type === 'real_step_pending') return 'Complete a to-do, record progress, or finish Focus.';
  if (rule.trigger.type === 'daily_usage_limit') return 'Wait until tomorrow or change the daily limit.';
  if (rule.trigger.type === 'composite') return 'Review this rule in Screen Time.';
  return 'Complete the family agreement.';
};

export function ScreenTimeUnlockGuide(props: {
  visible: boolean;
  rules: ScreenTimeRule[];
  actions: ScreenTimeGuideActions;
  unresolvedCount: number;
  result: TemporaryOpenResult | null;
  busy: boolean;
  onDismiss: () => void;
  onDoThisFirst: () => void;
  onOpenTemporarily: () => void;
}) {
  const count = props.rules.length + props.unresolvedCount;
  const opened = props.result?.status === 'opened' || props.result?.status === 'applying';
  const title = opened
    ? props.result?.status === 'applying' ? 'Opening on the child’s device…' : 'Open for 20 minutes.'
    : count > 1 ? `${count} rules are keeping this app paused.` : 'One thing comes first.';
  const body = opened
    ? props.result?.status === 'applying'
      ? 'The caregiver change is saved. Kwilt is waiting for the device to apply it.'
      : 'Kwilt will apply the rules again when the 20 minutes are up.'
    : props.actions.requiresCaregiver
      ? 'This rule cannot be skipped from a child account.'
      : 'You can do what the rule asks, or an authorized adult can make a short exception.';

  return (
    <BottomDrawer
      visible={props.visible}
      onClose={props.onDismiss}
      snapPoints={['55%']}
      dynamicSizing
      enableContentPanningGesture
      scrimToken="pineSubtle"
    >
      <BottomDrawerScrollView contentContainerStyle={styles.content}>
        <BottomDrawerHeader
          variant="withClose"
          title={title}
          subtitle={body}
          onClose={props.onDismiss}
          closeAccessibilityLabel="Close Screen Time guide"
        />

        {!opened ? (
          <VStack space={spacing.sm}>
            {props.rules.map((rule) => (
              <View key={rule.id} style={styles.ruleCard}>
                <Text variant="label">{rule.title}</Text>
                <Text tone="secondary" style={styles.ruleDetail}>{triggerDetail(rule)}</Text>
              </View>
            ))}
            {props.unresolvedCount > 0 ? (
              <View style={styles.ruleCard}>
                <Text variant="label">Another Screen Time rule</Text>
                <Text tone="secondary" style={styles.ruleDetail}>Open the rule in Kwilt to continue.</Text>
              </View>
            ) : null}
          </VStack>
        ) : null}

        {props.result?.status === 'failed' ? (
          <Text accessibilityRole="alert" tone="destructive">
            Kwilt could not change every rule. The app is still blocked.
          </Text>
        ) : null}

        <HStack space={spacing.sm} justifyContent="flex-end">
          {opened ? (
            <Button variant="primary" size="sm" onPress={props.onDismiss}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onPress={props.onDoThisFirst}>
                Do this first
              </Button>
              {props.actions.canTemporarilyOpen && props.unresolvedCount === 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={props.busy}
                  onPress={props.onOpenTemporarily}
                >
                  {props.busy ? 'Opening…' : 'Open for 20 min'}
                </Button>
              ) : null}
            </>
          )}
        </HStack>
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = {
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
