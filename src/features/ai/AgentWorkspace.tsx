import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMode } from './chatRegistry';
import type { GeneratedArc } from '../../services/ai';
import {
  type LaunchContext,
  type WorkflowDefinition,
  type WorkflowInstance,
  type WorkflowInstanceStatus,
  WORKFLOW_DEFINITIONS,
} from '../../domain/workflows';
import { AiChatPane, type AiChatPaneController } from './AiChatScreen';
import { WorkflowRuntimeContext } from './WorkflowRuntimeContext';
import { OnboardingGuidedFlow } from '../onboarding/OnboardingGuidedFlow';

export type AgentWorkspaceProps = {
  mode?: ChatMode;
  launchContext: LaunchContext;
  workflowDefinitionId?: string;
  workflowInstanceId?: string;
  /**
   * Optional free-form workspace snapshot string (for example, a summary of
   * existing arcs/goals) that will be passed into the chat pane alongside the
   * serialized LaunchContext so the model has richer context.
   */
  workspaceSnapshot?: string;
  /**
   * When provided in arcCreation mode, this callback is invoked when the user
   * confirms an Arc proposal inside the chat canvas.
   */
  onConfirmArc?: (proposal: GeneratedArc) => void;
  /**
   * Optional flag forwarded to AiChatPane to control whether any saved draft
   * for this workspace should be resumed on mount (arcCreation mode only).
   */
  resumeDraft?: boolean;
  /**
   * Optional analytics hook fired whenever a workflow step completes. This is
   * emitted after the local WorkflowInstance has been updated so listeners can
   * read the latest state.
   */
  onStepComplete?: (event: {
    definition: WorkflowDefinition;
    previousInstance: WorkflowInstance;
    nextInstance: WorkflowInstance;
    stepId: string;
    collected?: Record<string, unknown>;
    nextStepId?: string;
  }) => void;
  /**
   * Optional lifecycle hook fired when a workflow instance transitions
   * between statuses (for example, from "in_progress" to "completed").
   */
  onWorkflowStatusChange?: (instance: WorkflowInstance) => void;
  onComplete?: (outcome: unknown) => void;
  onDismiss?: () => void;
};

const serializeLaunchContext = (context: LaunchContext): string => {
  const parts: string[] = [`Launch source: ${context.source}.`];

  if (context.intent) {
    parts.push(`Intent: ${context.intent}.`);
  }

  if (context.entityRef) {
    parts.push(
      `Focused entity: ${context.entityRef.type}#${context.entityRef.id}.`,
    );
  }

  return parts.join(' ');
};

const createInitialWorkflowInstance = (
  definition: WorkflowDefinition,
  instanceIdFromProps?: string
): WorkflowInstance => {
  const firstStepId = definition.steps[0]?.id;
  return {
    id: instanceIdFromProps ?? `${definition.id}:local`,
    definitionId: definition.id,
    status: 'in_progress' as WorkflowInstanceStatus,
    currentStepId: firstStepId,
    collectedData: {},
    outcome: null,
  };
};

export function AgentWorkspace(props: AgentWorkspaceProps) {
  const {
    mode,
    launchContext,
    workflowDefinitionId,
    workflowInstanceId,
    workspaceSnapshot,
    onConfirmArc,
    resumeDraft,
    onStepComplete,
    onWorkflowStatusChange,
    onComplete,
  } = props;

  const chatPaneRef = useRef<AiChatPaneController | null>(null);

  const launchContextText = useMemo(() => {
    const base = serializeLaunchContext(launchContext);
    if (!workspaceSnapshot) {
      return base;
    }
    return `${base}\n\n${workspaceSnapshot}`;
  }, [launchContext, workspaceSnapshot]);

  const workflowDefinition: WorkflowDefinition | undefined = useMemo(() => {
    if (!workflowDefinitionId) return undefined;
    return WORKFLOW_DEFINITIONS[workflowDefinitionId];
  }, [workflowDefinitionId]);

  const [workflowInstance, setWorkflowInstance] = useState<WorkflowInstance | null>(() => {
    if (!workflowDefinition) {
      return null;
    }
    return createInitialWorkflowInstance(workflowDefinition, workflowInstanceId);
  });

  // Track the most recent step completion so we can emit analytics events
  // after React has applied the state update.
  const lastStepEventRef = useRef<{
    definition: WorkflowDefinition;
    previousInstance: WorkflowInstance;
    nextInstance: WorkflowInstance;
    stepId: string;
    collected?: Record<string, unknown>;
    nextStepId?: string;
  } | null>(null);

  useEffect(() => {
    if (!workflowDefinition) {
      setWorkflowInstance(null);
      return;
    }
    setWorkflowInstance((current) => {
      if (current && current.definitionId === workflowDefinition.id) {
        return current;
      }
      return createInitialWorkflowInstance(workflowDefinition, workflowInstanceId);
    });
  }, [workflowDefinition, workflowInstanceId]);

  const completeStep = useCallback(
    (stepId: string, collected?: Record<string, unknown>, nextStepIdOverride?: string) => {
      setWorkflowInstance((current) => {
        if (!current) return current;
        if (!workflowDefinition) return current;

        const step = workflowDefinition.steps.find((s) => s.id === stepId);
        const defaultNextStepId = step?.nextStepId;
        const nextStepId = nextStepIdOverride ?? defaultNextStepId;

        const nextCollectedData = {
          ...current.collectedData,
          ...(collected ?? {}),
        };

        const nextInstance: WorkflowInstance = {
          ...current,
          collectedData: nextCollectedData,
          currentStepId: nextStepId ?? current.currentStepId,
        };

        if (onStepComplete) {
          lastStepEventRef.current = {
            definition: workflowDefinition,
            previousInstance: current,
            nextInstance,
            stepId,
            collected,
            nextStepId,
          };
        }

        return nextInstance;
      });
    },
    [workflowDefinition, onStepComplete]
  );

  // Emit step-completion analytics after the instance state has been updated.
  useEffect(() => {
    if (!onStepComplete) return;
    if (!workflowDefinition) return;
    if (!workflowInstance) return;

    const pending = lastStepEventRef.current;
    if (!pending) return;

    if (pending.nextInstance !== workflowInstance) {
      return;
    }

    onStepComplete(pending);
    lastStepEventRef.current = null;
  }, [workflowInstance, workflowDefinition, onStepComplete]);

  const workflowStepCard = useMemo(() => {
    if (!workflowDefinition) {
      return undefined;
    }

    // Any workflow that uses the firstTimeOnboarding chatMode is hosted by the
    // shared OnboardingGuidedFlow presenter. The presenter inspects the
    // workflow definition ID to branch between v1 and v2 behavior.
    if (workflowDefinition.chatMode === 'firstTimeOnboarding') {
      return (
        <OnboardingGuidedFlow
          onComplete={() => {
            onComplete?.(workflowInstance?.collectedData ?? {});
          }}
          chatControllerRef={chatPaneRef}
        />
      );
    }

    return undefined;
  }, [workflowDefinition, workflowInstance, onComplete]);

  useEffect(() => {
    if (!workflowInstance) return;

    if (onWorkflowStatusChange) {
      onWorkflowStatusChange(workflowInstance);
    }

    if (workflowInstance.status !== 'completed') return;
    if (!onComplete) return;
    onComplete(workflowInstance.outcome ?? workflowInstance.collectedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowInstance, onWorkflowStatusChange]);

  // In development, emit a lightweight trace so we can confirm which mode and
  // workflow a given AgentWorkspace instance is running under.
  useEffect(() => {
    if (!__DEV__) return;
    // eslint-disable-next-line no-console
    console.log('[AgentWorkspace] mounted', {
      mode: mode ?? 'default',
      workflowDefinitionId: workflowDefinitionId ?? null,
      workflowInstanceId: workflowInstanceId ?? null,
      launchContext,
      workflowInstance,
    });
  }, [mode, workflowDefinitionId, workflowInstanceId, workflowInstance, launchContext]);

  // For now, AgentWorkspace is a light orchestrator that forwards mode and a
  // structured launch context string into the existing AiChatPane. As we
  // introduce real workflow instances and richer card rendering, this
  // component will become the primary host for those concerns.
  return (
    <WorkflowRuntimeContext.Provider
      value={{
        definition: workflowDefinition,
        instance: workflowInstance,
        completeStep,
      }}
    >
      <AiChatPane
        ref={chatPaneRef}
        mode={mode}
        launchContext={launchContextText}
        resumeDraft={resumeDraft}
        onConfirmArc={onConfirmArc}
        onComplete={onComplete}
        stepCard={workflowStepCard}
      />
    </WorkflowRuntimeContext.Provider>
  );
}



