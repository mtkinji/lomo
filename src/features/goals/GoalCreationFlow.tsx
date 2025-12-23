import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Input, SurveyCard } from '../../ui/primitives';
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
 * Goal creation workflow presenter.
 *
 * For the initial context collection step, we use a structured `SurveyCard`
 * (instead of the global chat composer) to keep this moment tap-first and
 * visually consistent with onboarding/arc creation.
 */
export function GoalCreationFlow({ chatControllerRef }: GoalCreationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();

  const definition = workflowRuntime?.definition;
  const instance = workflowRuntime?.instance;

  const isGoalCreationWorkflow = definition?.chatMode === 'goalCreation';
  const currentStepId = instance?.currentStepId;

  const isContextCollectActive =
    isGoalCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const [introStreamed, setIntroStreamed] = useState(false);
  const hasRequestedIntroRef = useRef(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [constraints, setConstraints] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isContextCollectActive) return;
    if (introStreamed) return;
    if (hasRequestedIntroRef.current) return;
    hasRequestedIntroRef.current = true;

    const controller = chatControllerRef?.current;
    if (!controller?.streamAssistantReplyFromWorkflow) {
      setIntroStreamed(true);
      return;
    }

    controller.streamAssistantReplyFromWorkflow(
      'What’s one goal you want to work on? If you can, add when (like tomorrow or next month).',
      'goal-intro-hint',
      {
        onDone: () => setIntroStreamed(true),
      },
    );
  }, [chatControllerRef, introStreamed, isContextCollectActive]);

  useEffect(() => {
    if (!isContextCollectActive) return;
    setStepIndex(0);
  }, [isContextCollectActive]);

  const handleSubmit = useCallback(async () => {
    if (!workflowRuntime || !isGoalCreationWorkflow) return;
    if (submitting) return;

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    const trimmedConstraints = constraints.trim();

    Keyboard.dismiss();

    // Mirror the user's answer into the transcript so the workflow reads like chat.
    chatControllerRef?.current?.appendUserMessage(
      trimmedConstraints.length > 0
        ? `${trimmedPrompt}\n\nConstraints: ${trimmedConstraints}`
        : trimmedPrompt,
    );

    workflowRuntime.completeStep('context_collect', {
      prompt: trimmedPrompt,
      constraints: trimmedConstraints.length > 0 ? trimmedConstraints : null,
    });

    try {
      setSubmitting(true);
      await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_goals' });
    } finally {
      setSubmitting(false);
    }
  }, [chatControllerRef, constraints, isGoalCreationWorkflow, prompt, submitting, workflowRuntime]);

  if (!isContextCollectActive) {
    return null;
  }

  const canProceedFromPrompt = prompt.trim().length > 0 && !submitting;
  const canSubmit = prompt.trim().length > 0 && !submitting;

  return (
    <View style={styles.container}>
      <SurveyCard
        steps={[
          {
            id: 'goal_prompt',
            title: 'Your goal (and when)',
            canProceed: canProceedFromPrompt,
            render: () => (
              <View style={styles.body}>
                <Input
                  multiline
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="e.g., Finish the first draft by next month; Start strength training 3×/week starting tomorrow."
                  editable={!submitting}
                  returnKeyType="done"
                  blurOnSubmit
                  multilineMinHeight={140}
                  multilineMaxHeight={140}
                />
              </View>
            ),
          },
          {
            id: 'constraints_optional',
            title: 'Constraints (optional)',
            canProceed: canSubmit,
            render: () => (
              <View style={styles.body}>
                <Input
                  multiline
                  value={constraints}
                  onChangeText={setConstraints}
                  placeholder="Anything to consider? Time, energy, budget, schedule…"
                  editable={!submitting}
                  returnKeyType="done"
                  blurOnSubmit
                  multilineMinHeight={112}
                  multilineMaxHeight={140}
                />
              </View>
            ),
          },
        ]}
        currentStepIndex={stepIndex}
        onBack={() => setStepIndex((current) => Math.max(0, current - 1))}
        onNext={() => setStepIndex((current) => Math.min(1, current + 1))}
        submitLabel={submitting ? 'Working…' : 'Continue'}
        onSubmit={handleSubmit}
        variant="stacked"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  body: {
    width: '100%',
  },
});
