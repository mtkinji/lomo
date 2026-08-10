import { View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { BottomGuide } from '../../../ui/BottomGuide';
import { Button } from '../../../ui/Button';
import { HStack, VStack } from '../../../ui/Stack';
import { Heading, Text } from '../../../ui/Typography';
import type { ScreenTimeGuideActions } from '../domain/screenTimeGuideActions';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import type { TemporaryOpenResult } from '../runtime/openScreenTimeRulesTemporarily';

const triggerDetail = (rule: ScreenTimeRule): string => {
  if (rule.trigger.type === 'focus_active') return 'Finish or end the current Focus.';
  if (rule.trigger.type === 'real_step_pending') return 'Complete a to-do, record progress, or finish Focus.';
  if (rule.trigger.type === 'money_review') return 'Review the category in Money.';
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
    <BottomGuide
      visible={props.visible}
      onClose={props.onDismiss}
      scrim="none"
      layout="inset"
      snapPoints={['55%']}
      dynamicSizing
    >
      <VStack space={spacing.md}>
        <VStack space={spacing.xs}>
          <Heading variant="sm">{title}</Heading>
          <Text tone="secondary">{body}</Text>
        </VStack>

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
      </VStack>
    </BottomGuide>
  );
}

const styles = {
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
