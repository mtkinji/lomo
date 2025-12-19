import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../ui/primitives';
import { QuestionCard } from '../../ui/QuestionCard';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';
import { useAppStore } from '../../store/useAppStore';
import { ObjectPicker, type ObjectPickerOption } from '../../ui/ObjectPicker';

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

  const isArcSelectStepActive =
    isGoalCreationWorkflow && (currentStepId === 'arc_select' || !currentStepId);

  const [submitting, setSubmitting] = useState(false);
  const [introStreamed, setIntroStreamed] = useState(false);
  const hasRequestedIntroRef = useRef(false);
  const arcs = useAppStore((state) => state.arcs);
  const [selectedArcPickerValue, setSelectedArcPickerValue] = useState<string>('');
  const SKIP_VALUE = '__skip__';

  const arcOptions = useMemo(() => {
    const list = arcs ?? [];
    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [arcs]);

  const pickerOptions: ObjectPickerOption[] = useMemo(() => {
    const options: ObjectPickerOption[] = arcOptions.map((arc) => ({
      value: arc.id,
      label: arc.name,
      keywords: [arc.name],
    }));
    options.push({
      value: SKIP_VALUE,
      label: 'Skip for now (attach when adopting)',
      keywords: ['skip', 'later', 'attach', 'adopt'],
    });
    return options;
  }, [SKIP_VALUE, arcOptions]);

  // Stream a small helper line into the normal timeline so it reads like typical
  // assistant copy (not special UI chrome). The choice card should only appear
  // after this text has finished typing.
  useEffect(() => {
    if (!isArcSelectStepActive) return;
    if (introStreamed) return;
    if (hasRequestedIntroRef.current) return;
    hasRequestedIntroRef.current = true;

    const controller = chatControllerRef?.current;
    if (!controller?.streamAssistantReplyFromWorkflow) {
      setIntroStreamed(true);
      return;
    }

    controller.streamAssistantReplyFromWorkflow(
      'Before we draft a goal, where should it live? Pick an Arc (or skip and attach it when adopting).',
      'goal-arc-select-hint',
      {
        onDone: () => setIntroStreamed(true),
      },
    );
  }, [chatControllerRef, introStreamed, isArcSelectStepActive]);

  const handleSelectArc = useCallback(
    async (nextArcId: string | null, arcName?: string) => {
      if (!workflowRuntime || !isGoalCreationWorkflow) {
        return;
      }

      const controller = chatControllerRef?.current;
      const promptSentence = nextArcId
        ? `I want this goal to live inside my “${arcName ?? 'selected'}” Arc.`
        : arcOptions.length === 0
          ? "I don't have an Arc yet — let's still draft a goal and I’ll attach it later."
          : "Not sure which Arc yet — let's draft a goal and I’ll attach it later.";

      workflowRuntime.completeStep('arc_select', {
        arcId: nextArcId,
      });

      // Mirror the answer into the shared chat timeline so the thread clearly
      // shows what the user shared, even though the input came from a
      // card instead of the free-form composer.
      if (controller) {
        controller.appendUserMessage(promptSentence);
      }

      // Now that the Arc decision is captured, ask what they want to make progress on.
      // We intentionally do NOT generate a goal yet — the next step (context_collect)
      // is satisfied by the user's next free-form message in the composer.
      if (controller?.streamAssistantReplyFromWorkflow) {
        controller.streamAssistantReplyFromWorkflow(
          'What do you want to make progress on over the next 30–90 days? One sentence is plenty.',
          'goal-context-prompt',
        );
      }
    },
    [arcOptions.length, chatControllerRef, isGoalCreationWorkflow, workflowRuntime],
  );

  const handlePickerChange = useCallback(
    (nextValue: string) => {
      setSelectedArcPickerValue(nextValue);
      if (!nextValue) {
        return;
      }
      if (nextValue === SKIP_VALUE) {
        void handleSelectArc(null);
        return;
      }
      const arc = arcOptions.find((a) => a.id === nextValue);
      void handleSelectArc(nextValue, arc?.name);
    },
    [SKIP_VALUE, arcOptions, handleSelectArc],
  );

  // Only render the card while the context-collection step is active. Once the
  // workflow advances, Goal creation continues as a normal chat-driven flow.
  if (!isArcSelectStepActive) {
    return null;
  }

  if (!introStreamed) {
    return null;
  }

  return (
    <QuestionCard
      title={
        <>
          Where should this Goal live?{' '}
          <Text style={styles.inlineTitleEmphasis}>Pick an Arc</Text>
        </>
      }
      style={styles.card}
    >
      <View style={styles.choiceList}>
        <ObjectPicker
          options={pickerOptions}
          value={selectedArcPickerValue}
          onValueChange={handlePickerChange}
          placeholder="Choose an Arc…"
          searchPlaceholder="Search Arcs…"
          emptyText="No matching Arcs."
          accessibilityLabel="Choose an Arc for this goal"
          allowDeselect={false}
          presentation="drawer"
          disabled={submitting}
        />
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
  choiceList: {
    gap: spacing.sm,
  },
  // (Rows removed — we now use the canonical `ObjectPicker` combobox.)
});

