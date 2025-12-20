import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMode } from './workflowRegistry';
import type { CoachChatTurn, CoachChatOptions, GeneratedArc } from '../../services/ai';
import {
  type LaunchContext,
  type WorkflowDefinition,
  type WorkflowInstance,
  type WorkflowInstanceStatus,
} from '../../domain/workflows';
import { WORKFLOW_REGISTRY } from './workflowRegistry';
import {
  AiChatPane,
  type AiChatPaneController,
  type ActivitySuggestion,
  type ChatTimelineController,
} from './AiChatScreen';
import { WorkflowRuntimeContext, type InvokeAgentStepParams } from './WorkflowRuntimeContext';
import { IdentityAspirationFlow } from '../onboarding/IdentityAspirationFlow';
import { ArcCreationFlow } from '../arcs/ArcCreationFlow';
import { GoalCreationFlow } from '../goals/GoalCreationFlow';
import { FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID } from '../../domain/workflows';
import { sendCoachChat } from '../../services/ai';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

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
   * When true, the host surface already includes bottom safe-area padding
   * (e.g. BottomDrawer sheet padding). This is forwarded to AiChatPane so
   * its keyboard inset math doesn’t double-count `insets.bottom`.
   */
  hostBottomInsetAlreadyApplied?: boolean;
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

  /**
   * Optional hook fired when the user adopts a Goal proposal inside goalCreation mode.
   * Hosts can use this to close the sheet or navigate to the new Goal canvas.
   */
  onGoalCreated?: (goalId: string) => void;
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
    onGoalCreated,
    hostBottomInsetAlreadyApplied,
  } = props;

  const chatPaneRef = useRef<AiChatPaneController | null>(null);
  const { capture } = useAnalytics();

  const launchContextText = useMemo(() => {
    const base = serializeLaunchContext(launchContext);
    if (!workspaceSnapshot) {
      return base;
    }
    return `${base}\n\n${workspaceSnapshot}`;
  }, [launchContext, workspaceSnapshot]);

  const workflowDefinition: WorkflowDefinition | undefined = useMemo(() => {
    if (!workflowDefinitionId) return undefined;
    // Look up by workflowDefinitionId in WORKFLOW_REGISTRY (keyed by ChatMode)
    // or fall back to a future per-workflow-ID lookup if we add that layer.
    // For now, workflowDefinitionId should match a ChatMode.
    return (WORKFLOW_REGISTRY as Record<string, WorkflowDefinition>)[workflowDefinitionId];
  }, [workflowDefinitionId]);

  // If a host only provides `workflowDefinitionId` (common for embedded flows),
  // default the UI mode to the workflow's declared chatMode so:
  // - the correct mode system prompt is injected
  // - structured proposal cards (Goal/Arc/etc.) render and parse correctly
  const effectiveMode: ChatMode | undefined = useMemo(() => {
    if (mode) return mode;
    return workflowDefinition?.chatMode;
  }, [mode, workflowDefinition]);

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
  const lastTrackedStepIdRef = useRef<string | null>(null);
  const latestInstanceRef = useRef<WorkflowInstance | null>(null);
  const latestDefinitionRef = useRef<WorkflowDefinition | undefined>(undefined);

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

  useEffect(() => {
    latestInstanceRef.current = workflowInstance;
    latestDefinitionRef.current = workflowDefinition;
  }, [workflowDefinition, workflowInstance]);

  useEffect(() => {
    if (!workflowDefinition) return;
    if (!workflowInstance) return;

    if (!hasLoggedWorkflowStartRef.current) {
      hasLoggedWorkflowStartRef.current = true;
      capture(AnalyticsEvent.WorkflowStarted, {
        workflow_id: workflowDefinition.id,
        workflow_mode: workflowDefinition.chatMode,
        workflow_instance_id: workflowInstance.id,
      });
    }

    const stepId = workflowInstance.currentStepId ?? null;
    if (!stepId) return;
    if (lastTrackedStepIdRef.current === stepId) return;

    lastTrackedStepIdRef.current = stepId;
    const stepIndex = workflowDefinition.steps.findIndex((s) => s.id === stepId);
    const stepLabel = workflowDefinition.steps[stepIndex]?.label;
    capture(AnalyticsEvent.WorkflowStepViewed, {
      workflow_id: workflowDefinition.id,
      workflow_mode: workflowDefinition.chatMode,
      workflow_instance_id: workflowInstance.id,
      step_id: stepId,
      step_index: stepIndex === -1 ? null : stepIndex,
      step_label: stepLabel ?? null,
    });
  }, [capture, workflowDefinition, workflowInstance]);

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

        // For most workflows, reaching a step with no nextStepId means the
        // workflow has completed. We intentionally skip auto-completing the
        // first-time onboarding workflow so FTUE presenters stay in full
        // control of lifecycle and host callbacks.
        const shouldAutoCompleteOnTerminal =
          workflowDefinition.chatMode !== 'firstTimeOnboarding';

        const isTerminalStep = !nextStepId;

        const nextInstance: WorkflowInstance = {
          ...current,
          collectedData: nextCollectedData,
          currentStepId: nextStepId ?? current.currentStepId,
          status:
            shouldAutoCompleteOnTerminal && isTerminalStep ? ('completed' as WorkflowInstanceStatus) : current.status,
          outcome:
            shouldAutoCompleteOnTerminal && isTerminalStep
              ? (nextCollectedData as Record<string, unknown>)
              : current.outcome ?? null,
        };

        lastStepEventRef.current = {
          definition: workflowDefinition,
          previousInstance: current,
          nextInstance,
          stepId,
          collected,
          nextStepId,
        };

        return nextInstance;
      });
    },
    [workflowDefinition]
  );

  const invokeAgentStep = useCallback(
    async ({ stepId }: InvokeAgentStepParams) => {
      if (!workflowDefinition) return;
      if (!workflowInstance) return;

      const controller = chatPaneRef.current as ChatTimelineController | null;
      if (!controller) return;

      const history: CoachChatTurn[] = controller.getHistory();

      const coachOptions: CoachChatOptions = {
        mode: workflowDefinition.chatMode,
        workflowDefinitionId: workflowDefinition.id,
        workflowInstanceId: workflowInstance.id,
        workflowStepId: stepId,
        launchContextSummary: launchContextText,
      };

      // Surface any configured, step-specific loading message while the agent
      // call is in flight so users always see that the workflow-specific AI is
      // actively working.
      const step = workflowDefinition.steps.find((s) => s.id === stepId);
      const loadingMessage = step?.agentBehavior?.loadingMessage;
      if (loadingMessage) {
        const loadingId =
          step?.agentBehavior?.loadingMessageId ?? `assistant-step-status-${stepId}`;
        controller.streamAssistantReplyFromWorkflow(loadingMessage, loadingId);
      }

      try {
        const stepGuidanceTurns: CoachChatTurn[] = [];
        if (step?.promptTemplate) {
          const validationHint = step.validationHint ? `\n\nValidation hint:\n${step.validationHint}` : '';
          stepGuidanceTurns.push({
            role: 'system',
            content: `Workflow step instruction (${workflowDefinition.chatMode}:${stepId}):\n${step.promptTemplate}${validationHint}`.trim(),
          });
        }

        const reply = await sendCoachChat([...history, ...stepGuidanceTurns], coachOptions);
        controller.streamAssistantReplyFromWorkflow(reply, 'assistant-workflow');
      } catch (error) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[workflow] Failed to invoke agent step', stepId, error);
        }
      }
    },
    [launchContextText, workflowDefinition, workflowInstance]
  );

  // Emit step-completion analytics after the instance state has been updated.
  useEffect(() => {
    if (!workflowDefinition) return;
    if (!workflowInstance) return;

    const pending = lastStepEventRef.current;
    if (!pending) return;

    if (pending.nextInstance !== workflowInstance) {
      return;
    }

    const stepIndex = pending.definition.steps.findIndex((s) => s.id === pending.stepId);
    const stepLabel = pending.definition.steps[stepIndex]?.label;
    capture(AnalyticsEvent.WorkflowStepCompleted, {
      workflow_id: pending.definition.id,
      workflow_mode: pending.definition.chatMode,
      workflow_instance_id: pending.nextInstance.id,
      step_id: pending.stepId,
      step_index: stepIndex === -1 ? null : stepIndex,
      step_label: stepLabel ?? null,
      next_step_id: pending.nextStepId ?? null,
      collected_keys_count: pending.collected ? Object.keys(pending.collected).length : 0,
    });

    onStepComplete?.(pending);
    lastStepEventRef.current = null;
  }, [capture, workflowInstance, workflowDefinition, onStepComplete]);

  useEffect(() => {
    return () => {
      const definition = latestDefinitionRef.current;
      const instance = latestInstanceRef.current;
      if (!definition || !instance) return;
      if (instance.status === 'completed') return;

      const stepId = instance.currentStepId ?? null;
      const stepIndex = stepId ? definition.steps.findIndex((s) => s.id === stepId) : -1;
      const stepLabel = stepId ? definition.steps[stepIndex]?.label : undefined;
      capture(AnalyticsEvent.WorkflowAbandoned, {
        workflow_id: definition.id,
        workflow_mode: definition.chatMode,
        workflow_instance_id: instance.id,
        step_id: stepId,
        step_index: stepIndex === -1 ? null : stepIndex,
        step_label: stepLabel ?? null,
      });
    };
  }, [capture]);

  // Workflow-driven UI enters the chat surface as a generic `stepCard` node.
  // Presenters like IdentityAspirationFlow render into this slot so that all
  // cards still appear inside the shared AiChatPane timeline.
  const workflowStepCard = useMemo(() => {
    if (!workflowDefinition) {
      return undefined;
    }

    // Any workflow that uses the firstTimeOnboarding chatMode is hosted by a
    // shared onboarding presenter. For the v2 identity-Arc FTUE we use a
    // dedicated, tap-first flow rendered by IdentityAspirationFlow.
    if (workflowDefinition.chatMode === 'firstTimeOnboarding') {
      // FTUE v2 – identity Arc / aspiration. This is the only active
      // first-time onboarding workflow; legacy guided flows have been
      // retired in favour of this presenter.
      if (workflowDefinition.id === FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID) {
        return (
          <IdentityAspirationFlow
            onComplete={() => {
              onComplete?.(workflowInstance?.collectedData ?? {});
            }}
            chatControllerRef={chatPaneRef as React.RefObject<ChatTimelineController | null>}
          />
        );
      }
    }

    // Arc creation uses a lightweight presenter for the initial context step so
    // the user sees a clear, structured entry point before continuing in the
    // shared chat surface.
    if (workflowDefinition.chatMode === 'arcCreation') {
      return (
        <ArcCreationFlow
          chatControllerRef={chatPaneRef as React.RefObject<ChatTimelineController | null>}
        />
      );
    }

    if (workflowDefinition.chatMode === 'goalCreation') {
      return (
        <GoalCreationFlow
          chatControllerRef={chatPaneRef as React.RefObject<ChatTimelineController | null>}
        />
      );
    }

    return undefined;
  }, [workflowDefinition, workflowInstance, onComplete]);

  // In development, surface a gentle warning when a host accidentally pairs a
  // ChatMode with a workflow whose chatMode does not match. This helps keep
  // prompts, tools, and step graphs aligned.
  useEffect(() => {
    if (!__DEV__) return;
    if (!workflowDefinition) return;
    if (!mode) return;

    if (workflowDefinition.chatMode !== mode) {
      // eslint-disable-next-line no-console
      console.warn(
        '[workflow] Mismatched mode / workflowDefinitionId:',
        `mode=${mode}`,
        `workflow.chatMode=${workflowDefinition.chatMode}`,
        `workflow.id=${workflowDefinition.id}`
      );
    }
  }, [mode, workflowDefinition]);

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
        invokeAgentStep,
      }}
    >
      {/* All AI chat and cards go through this pane; no other chat surfaces
          should exist elsewhere in the app. */}
      <AiChatPane
        ref={chatPaneRef}
        mode={effectiveMode}
        launchContext={launchContextText}
        resumeDraft={resumeDraft}
        hideBrandHeader={hideBrandHeader}
        hidePromptSuggestions={hidePromptSuggestions}
        hostBottomInsetAlreadyApplied={hostBottomInsetAlreadyApplied}
        onConfirmArc={onConfirmArc}
        onGoalCreated={onGoalCreated}
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



