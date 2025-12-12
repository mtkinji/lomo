import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { QuestionCard } from '../../ui/QuestionCard';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';

type GoalCreationFlowProps = {
  /**
   * Optional handle to the shared chat surface. This flow treats the chat
   * controller as its only link to the visible thread: it can mirror user
   * answers into the transcript, but it never mounts its own chat UI.
   */
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
};

/**
 * Lightweight presenter for the Goal creation workflow.
 *
 * This mirrors the ArcCreationFlow pattern: a focused, tap-first context
 * card that feeds structured data into the workflow and then hands off to
 * the shared chat surface for the rest of the flow.
 */
export function GoalCreationFlow({ chatControllerRef }: GoalCreationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();

  const definition = workflowRuntime?.definition;
  const instance = workflowRuntime?.instance;

  const isGoalCreationWorkflow = definition?.chatMode === 'goalCreation';
  const currentStepId = instance?.currentStepId;

  const isContextStepActive =
    isGoalCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const [submitting, setSubmitting] = useState(false);

  const handleSelectDirection = useCallback(
    async (label: string) => {
      if (!workflowRuntime || !isGoalCreationWorkflow) {
        return;
      }

      const controller = chatControllerRef?.current;
      const promptSentence = `Inside this part of my life, I want to focus on ${label.toLowerCase()} over the next 1–3 months.`;

      // Record structured context on the workflow so future steps (and the
      // host app) can reason about what the user shared.
      workflowRuntime.completeStep('context_collect', {
        prompt: promptSentence,
        timeHorizon: 'next 1–3 months',
      });

      // Mirror the answer into the shared chat timeline so the thread clearly
      // shows what the user told Goal AI, even though the input came from a
      // card instead of the free-form composer.
      if (controller) {
        controller.appendUserMessage(promptSentence);
      }

      // Ask the shared workflow runtime to run the agent_generate step so
      // progress UI and transport are owned centrally.
      try {
        setSubmitting(true);
        await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_goals' });
      } finally {
        setSubmitting(false);
      }
    },
    [chatControllerRef, isGoalCreationWorkflow, workflowRuntime],
  );

  // Only render the card while the context-collection step is active. Once the
  // workflow advances, Goal creation continues as a normal chat-driven flow.
  if (!isContextStepActive) {
    return null;
  }

  const options = [
    'Learning the craft',
    'Building a habit of consistency',
    'Strengthening my courage',
    'Improving my skills',
    'Supporting others generously',
    'Making something real',
    'Something else',
  ];

  return (
    <QuestionCard
      title={
        <>
          For the next few months…{' '}
          <Text style={styles.inlineTitleEmphasis}>what kind of progress matters most?</Text>
        </>
      }
      style={styles.card}
    >
      <View style={styles.chipGrid}>
        {options.map((label) => (
          <Pressable
            key={label}
            style={styles.chip}
            disabled={submitting}
            onPress={() => {
              void handleSelectDirection(label);
            }}
          >
            <Text style={styles.chipLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.footerHintRow}>
        <Text style={styles.footerHintText}>
          Your choice here helps Goal AI shape one clear 30–90 day goal instead of a vague wish.
        </Text>
      </View>
      <View style={styles.footerActionsRow}>
        <Button
          variant="ghost"
          size="small"
          onPress={() => {
            const controller = chatControllerRef?.current;
            if (controller) {
              controller.appendUserMessage(
                'I’d rather describe the kind of progress I want in my own words.',
              );
            }
            // Leave the workflow on context_collect so the next free-form
            // message can still satisfy this step.
          }}
        >
          <Text style={styles.skipLabel}>Skip this for now</Text>
        </Button>
      </View>
    </QuestionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
  inlineTitleEmphasis: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.shellAlt,
  },
  chipLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  footerHintRow: {
    marginTop: spacing.md,
  },
  footerHintText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  footerActionsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  skipLabel: {
    ...typography.bodySm,
    color: colors.accent,
  },
});

