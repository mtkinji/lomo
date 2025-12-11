import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { QuestionCard } from '../../ui/QuestionCard';
import { Input } from '../../ui/Input';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';

type ArcCreationFlowProps = {
  /**
   * Optional handle to the shared chat surface. This flow treats the chat
   * controller as its only link to the visible thread: it can mirror user
   * answers into the transcript, but it never mounts its own chat UI.
   */
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
};

/**
 * Lightweight presenter for the Arc creation workflow.
 *
 * This component owns the initial context-collection card for new Arc
 * creation and talks to the agent runtime only through
 * `WorkflowRuntimeContext` + `ChatTimelineController` so that all messages
 * still flow through the shared AgentWorkspace + AiChatPane timeline.
 */
export function ArcCreationFlow({ chatControllerRef }: ArcCreationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();

  const definition = workflowRuntime?.definition;
  const instance = workflowRuntime?.instance;

  const isArcCreationWorkflow = definition?.chatMode === 'arcCreation';
  const currentStepId = instance?.currentStepId;

  const isContextStepActive =
    isArcCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const [desireText, setDesireText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!workflowRuntime || !isArcCreationWorkflow) {
      return;
    }

    const trimmed = desireText.trim();
    if (!trimmed) {
      return;
    }

    // Record structured context on the workflow so future steps (and the
    // host app) can reason about what the user shared.
    workflowRuntime.completeStep('context_collect', {
      prompt: trimmed,
    });

    // Mirror the answer into the shared chat timeline so the thread clearly
    // shows what the user told Arc AI, even though the input came from a
    // card instead of the free-form composer.
    const controller = chatControllerRef?.current;
    if (controller) {
      controller.appendUserMessage(trimmed);
    }
    // Hand off to the shared workflow runtime so it can invoke the
    // agent-driven generation step and manage progress UI.
    try {
      setSubmitting(true);
      await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_arc' });
    } finally {
      setSubmitting(false);
    }
  }, [chatControllerRef, desireText, isArcCreationWorkflow, workflowRuntime]);

  // Only render the card while the context-collection step is active. Once the
  // workflow advances, Arc creation continues as a normal chat-driven flow.
  if (!isContextStepActive) {
    return null;
  }

  return (
    <QuestionCard
      title="Looking ahead, what’s one big thing you’d love to bring to life?"
      style={styles.card}
    >
      <View style={styles.body}>
        <Input
          // label="In your own words"
          placeholder="e.g., Build a small timber-frame studio in the woods."
          multiline
          numberOfLines={4}
          value={desireText}
          onChangeText={setDesireText}
        />
        <View style={styles.actionsRow}>
          <Button
            style={styles.primaryButton}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={desireText.trim().length === 0 || submitting}
          >
            <Text style={styles.primaryButtonLabel}>
              {submitting ? 'Thinking…' : 'Continue'}
            </Text>
          </Button>
        </View>
      </View>
    </QuestionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    // Let AiChatPane's `stepCardHost` control the vertical offset so the card
    // sits directly under the Agent header without extra stacked margins.
    marginTop: 0,
  },
  body: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  actionsRow: {
    marginTop: spacing.sm,
  },
  primaryButton: {
    alignSelf: 'stretch',
  },
  primaryButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
});

