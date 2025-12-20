import React, { useEffect, useRef, useState } from 'react';
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

  const isContextCollectActive =
    isGoalCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const [introStreamed, setIntroStreamed] = useState(false);
  const hasRequestedIntroRef = useRef(false);

  // Stream a small helper line into the normal timeline so it reads like typical
  // assistant copy (not special UI chrome).
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

  // Chat-first: no step card. We only stream an intro once.
  if (!isContextCollectActive || !introStreamed) {
    return null;
  }

    return null;
  }

