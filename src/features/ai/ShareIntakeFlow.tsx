import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from './WorkflowRuntimeContext';
import { useShareIntentStore } from '../../store/useShareIntentStore';

type CreateKind = 'arc' | 'goal' | 'activity';

function summarizeShare(payload: ReturnType<typeof useShareIntentStore.getState>['payload']): string {
  if (!payload?.items?.length) return 'No share content found.';
  const first = payload.items.find((i) => typeof i?.value === 'string' && i.value.trim().length > 0) ?? payload.items[0];
  const firstValue = typeof first?.value === 'string' ? first.value.trim() : '';
  const suffix = payload.items.length > 1 ? ` (+${payload.items.length - 1} more)` : '';
  if (!firstValue) return `Shared content received${suffix}.`;
  // Keep this short; full content goes into the agent workspace snapshot later.
  const preview = firstValue.length > 120 ? `${firstValue.slice(0, 117)}…` : firstValue;
  return `${preview}${suffix}`;
}

export function ShareIntakeFlow() {
  const workflowRuntime = useWorkflowRuntime();
  const payload = useShareIntentStore((s) => s.payload);

  const preview = useMemo(() => summarizeShare(payload), [payload]);

  const choose = (kinds: CreateKind[]) => {
    workflowRuntime?.completeStep('intent_pick', {
      createKinds: kinds,
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Turn this share into…</Text>
      <Text style={styles.preview} numberOfLines={3}>
        {preview}
      </Text>
      <View style={styles.buttonRow}>
        <Button variant="ai" onPress={() => choose(['activity'])} style={styles.button}>
          <Text style={styles.primaryButtonText}>Activity</Text>
        </Button>
        <Button variant="ai" onPress={() => choose(['goal'])} style={styles.button}>
          <Text style={styles.primaryButtonText}>Goal</Text>
        </Button>
        <Button variant="ai" onPress={() => choose(['arc'])} style={styles.button}>
          <Text style={styles.primaryButtonText}>Arc</Text>
        </Button>
      </View>
      <View style={styles.secondaryRow}>
        <Button variant="outline" onPress={() => choose(['arc', 'goal', 'activity'])} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Create all (Arc + Goal + Activities)</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  preview: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    flexGrow: 1,
    minWidth: 110,
  },
  primaryButtonText: {
    color: colors.canvas,
    ...typography.bodySm,
  },
  secondaryRow: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    ...typography.bodySm,
  },
});


