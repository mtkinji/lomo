import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { WorkflowFeedbackQuestion } from './WorkflowFeedbackQuestion';
import { useWorkflowFeedbackRuntime, type WorkflowFeedbackRuntimeValue } from './workflowFeedbackRuntime';

export function WorkflowFeedbackInlineSlot({ sourceKey }: { sourceKey: string }) {
  return useWorkflowFeedbackInlineSlot(sourceKey);
}

/** Resolve context before a guide moves its content to the root portal host. */
export function useWorkflowFeedbackInlineSlot(sourceKey?: string) {
  const runtime = useWorkflowFeedbackRuntime();
  return sourceKey ? <WorkflowFeedbackInlineContent sourceKey={sourceKey} runtime={runtime} /> : null;
}

function WorkflowFeedbackInlineContent({ sourceKey, runtime }: {
  sourceKey: string;
  runtime: WorkflowFeedbackRuntimeValue;
}) {
  const active = runtime.active?.placement === 'inline' && runtime.active.sourceKey === sourceKey
    ? runtime.active
    : null;
  useEffect(() => {
    if (!active) return undefined;
    return () => runtime.dismiss();
  }, [active?.instanceId, runtime.dismiss]);
  if (!active) return null;
  return (
    <View style={styles.slot} testID="workflow-feedback.inline-slot">
      <WorkflowFeedbackQuestion
        key={active.instanceId}
        prompt={active.prompt}
        onSubmit={runtime.submit}
        onReason={runtime.submitReason}
        onDismiss={runtime.dismiss}
        onComplete={runtime.complete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.fieldFill,
  },
});
