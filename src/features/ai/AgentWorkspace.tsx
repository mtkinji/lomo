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
import { AiChatPane, type AiChatPaneController, type ActivitySuggestion } from './AiChatScreen';
import { WorkflowRuntimeContext } from './WorkflowRuntimeContext';
import { OnboardingGuidedFlow } from '../onboarding/OnboardingGuidedFlow';
import { IdentityAspirationFlow } from '../onboarding/IdentityAspirationFlow';
import { FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID } from '../../domain/workflows';

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
  /**
   * When true, hide the kwilt brand header inside the chat timeline.
   * Hosts that render their own header chrome (e.g., New Arc bottom sheet)
   * can use this to avoid duplicate branding.
   */
  hideBrandHeader?: boolean;
  /**
   * When true, hide the default prompt suggestions rail in the underlying
   * chat pane so hosts can provide their own focused guidance.
   */
  hidePromptSuggestions?: boolean;
  /**
   * Optional hook fired when the underlying chat transport fails. Hosts can
   * use this to surface manual fallbacks.
   */
  onTransportError?: () => void;
  /**
   * Optional hook fired when the user chooses to fall back to a manual flow
   * (for example, tapping "Create manually instead" in Activities AI). This is
   * distinct from `onTransportError`, which represents a network failure.
   */
  onManualFallbackRequested?: () => void;
  /**
   * Optional hook fired when the user taps "Accept" on an AI-generated
   * activity suggestion card in activityCreation mode.
   */
  onAdoptActivitySuggestion?: (suggestion: ActivitySuggestion) => void;
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

  if (context.objectType && context.objectId) {
    parts.push(`Object: ${context.objectType}#${context.objectId}.`);
  }

  if (context.fieldId) {
    const label = context.fieldLabel ? ` (${context.fieldLabel})` : '';
    parts.push(`Field: ${context.fieldId}${label}.`);
  }

  if (context.currentText) {
    parts.push(
      'Current field text (truncated if needed by the host):',
      context.currentText,
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

/**
 * Single host/orchestrator for all agent workflows.
 *
 * AgentWorkspace always lives inside the existing AppShell + canvas layers and
 * never replaces them. It owns workflow state and forwards a single shared
 * chat + cards timeline into AiChatPane; any workflow-specific UI should be
 * provided as a `stepCard` rendered inside that pane, not as a separate chat
 * surface or modal stack.
 */
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
    hideBrandHeader,
    hidePromptSuggestions,
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

  // Track whether we've already logged a human-readable "workflow started"
  // event for this AgentWorkspace mount. This keeps dev logs focused on
  // high-signal transitions instead of repeating on every step change.
  const hasLoggedWorkflowStartRef = useRef(false);

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

  // Workflow-driven UI enters the chat surface as a generic `stepCard` node.
  // Presenters like IdentityAspirationFlow render into this slot so that all
  // cards still appear inside the shared AiChatPane timeline.
  const workflowStepCard = useMemo(() => {
    if (!workflowDefinition) {
      return undefined;
    }

    // Any workflow that uses the firstTimeOnboarding chatMode is hosted by a
    // shared onboarding presenter. For the v2 identity-Arc FTUE we use a
    // dedicated, tap-first flow; any future legacy flows can continue to use
    // the older OnboardingGuidedFlow presenter.
    if (workflowDefinition.chatMode === 'firstTimeOnboarding') {
      if (workflowDefinition.id === FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID) {
        return (
          <IdentityAspirationFlow
            onComplete={() => {
              onComplete?.(workflowInstance?.collectedData ?? {});
            }}
            chatControllerRef={chatPaneRef}
          />
        );
      }

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

    if (workflowDefinition && !hasLoggedWorkflowStartRef.current) {
      if (__DEV__ && workflowInstance.status === 'in_progress') {
        const label = workflowDefinition.label || workflowDefinition.id;
        const contextBits: string[] = [];
        if (launchContext.source) {
          contextBits.push(launchContext.source);
        }
        if (launchContext.intent) {
          contextBits.push(launchContext.intent);
        }
        const fromClause =
          contextBits.length > 0 ? ` from ${contextBits.join(' / ')}` : '';

        // eslint-disable-next-line no-console
        console.log(
          '[workflow] User started',
          `${label}${fromClause}`,
        );
        hasLoggedWorkflowStartRef.current = true;
      }
    }

    if (onWorkflowStatusChange) {
      onWorkflowStatusChange(workflowInstance);
    }

    if (workflowInstance.status !== 'completed') return;
    if (!onComplete) return;
    onComplete(workflowInstance.outcome ?? workflowInstance.collectedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowInstance, onWorkflowStatusChange]);

  // For now, AgentWorkspace is a light orchestrator that forwards mode and a
  // structured launch context string into the existing AiChatPane. As we
  // introduce real workflow instances and richer card rendering, this
  // component remains the primary host for all AI workflows and their single
  // shared chat surface.
  return (
    <WorkflowRuntimeContext.Provider
      value={{
        definition: workflowDefinition,
        instance: workflowInstance,
        completeStep,
      }}
    >
      {/* All AI chat and cards go through this pane; no other chat surfaces
          should exist elsewhere in the app. */}
      <AiChatPane
        ref={chatPaneRef}
        mode={mode}
        launchContext={launchContextText}
        resumeDraft={resumeDraft}
        hideBrandHeader={hideBrandHeader}
        hidePromptSuggestions={hidePromptSuggestions}
        onConfirmArc={onConfirmArc}
        onComplete={onComplete}
        stepCard={workflowStepCard}
        onTransportError={props.onTransportError}
        onManualFallbackRequested={props.onManualFallbackRequested}
        onAdoptActivitySuggestion={props.onAdoptActivitySuggestion}
        onDismiss={props.onDismiss}
      />
    </WorkflowRuntimeContext.Provider>
  );
}



