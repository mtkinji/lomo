import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatMode } from './chatRegistry';
import type { GeneratedArc } from '../../services/ai';
import {
  type LaunchContext,
  type WorkflowDefinition,
  type WorkflowInstance,
  type WorkflowInstanceStatus,
  WORKFLOW_DEFINITIONS,
} from '../../domain/workflows';
import { AiChatPane } from './AiChatScreen';
import { WorkflowRuntimeContext } from './WorkflowRuntimeContext';

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
    onComplete,
  } = props;

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

        return nextInstance;
      });
    },
    [workflowDefinition]
  );

  useEffect(() => {
    if (!workflowInstance || workflowInstance.status !== 'completed') return;
    if (!onComplete) return;
    onComplete(workflowInstance.outcome ?? workflowInstance.collectedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowInstance?.status]);

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
        mode={mode}
        launchContext={launchContextText}
        resumeDraft={resumeDraft}
        onConfirmArc={onConfirmArc}
        onComplete={onComplete}
      />
    </WorkflowRuntimeContext.Provider>
  );
}



