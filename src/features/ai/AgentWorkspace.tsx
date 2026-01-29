import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  type GoalProposalDraft,
  type ChatTimelineController,
} from './AiChatScreen';
import { WorkflowRuntimeContext, type InvokeAgentStepParams } from './WorkflowRuntimeContext';
import { IdentityAspirationFlow } from '../onboarding/IdentityAspirationFlow';
import { ArcCreationFlow } from '../arcs/ArcCreationFlow';
import { GoalCreationFlow } from '../goals/GoalCreationFlow';
import { FIRST_TIME_ONBOARDING_WORKFLOW_V2_ID } from '../../domain/workflows';
import { getOpenAiQuotaExceededStatus, sendCoachChat } from '../../services/ai';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { PaywallContent } from '../paywall/PaywallDrawer';
import { openPaywallPurchaseEntry } from '../../services/paywall';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import {
  FREE_GENERATIVE_CREDITS_PER_MONTH,
  PRO_GENERATIVE_CREDITS_PER_MONTH,
  getMonthKey,
} from '../../domain/generativeCredits';
import { BrandLockup } from '../../ui/BrandLockup';
import { Icon } from '../../ui/Icon';
import { Dialog, Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { useArcDraftClaimStore } from '../../store/useArcDraftClaimStore';
import { ArcDraftContinueFlow } from '../arcs/ArcDraftContinueFlow';
import { ShareIntakeFlow } from './ShareIntakeFlow';

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
  /**
   * Optional hook fired when the user adopts a Goal proposal but the host wants
   * to apply it without creating a new goal (e.g. refine an existing goal).
   */
  onAdoptGoalProposal?: (proposal: GoalProposalDraft) => void;
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
    onAdoptGoalProposal,
    hostBottomInsetAlreadyApplied,
  } = props;

  const chatPaneRef = useRef<AiChatPaneController | null>(null);
  const { capture } = useAnalytics();
  const isPro = useEntitlementsStore((s) => s.isPro);
  const generativeCredits = useAppStore((s) => s.generativeCredits);

  const aiCreditsRemaining = useMemo(() => {
    const limit = isPro ? PRO_GENERATIVE_CREDITS_PER_MONTH : FREE_GENERATIVE_CREDITS_PER_MONTH;
    const currentKey = getMonthKey(new Date());
    const ledger =
      generativeCredits && generativeCredits.monthKey === currentKey
        ? generativeCredits
        : { monthKey: currentKey, usedThisMonth: 0 };
    const usedRaw = Number((ledger as any).usedThisMonth ?? 0);
    const used = Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
    return Math.max(0, limit - used);
  }, [generativeCredits, isPro]);

  const paywallSource = useMemo(() => {
    if (launchContext.source === 'activityDetail') return 'activity_detail_ai' as const;
    return 'unknown' as const;
  }, [launchContext.source]);

  const [isWorkflowInfoVisible, setIsWorkflowInfoVisible] = useState(false);
  const [hasAiQuotaExceeded, setHasAiQuotaExceeded] = useState(false);
  const arcDraftPayload = useArcDraftClaimStore((s) => s.payload);

  useEffect(() => {
    // If dev tooling (or time-based proxy retryAt) clears the global quota flag,
    // un-pin the local quota state so the paywall disappears immediately.
    if (hasAiQuotaExceeded && aiCreditsRemaining > 0 && !getOpenAiQuotaExceededStatus()) {
      setHasAiQuotaExceeded(false);
    }
  }, [aiCreditsRemaining, hasAiQuotaExceeded]);

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

        // Always include any workflow-collected user inputs as an authoritative snapshot.
        // Some workflows collect data via step cards (not the freeform composer). If the
        // presenter forgets to append those answers into the visible transcript, relying
        // solely on chat history can cause the model to "miss" the user's submission.
        const collectedEntries = Object.entries(workflowInstance.collectedData ?? {}).filter(
          ([, value]) => {
            if (value === null || typeof value === 'undefined') return false;
            if (typeof value === 'string') return value.trim().length > 0;
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === 'object') return Object.keys(value as any).length > 0;
            return true;
          }
        );
        if (collectedEntries.length > 0) {
          const lines = collectedEntries.map(([key, value]) => {
            if (typeof value === 'string') return `- ${key}: ${value.trim()}`;
            try {
              return `- ${key}: ${JSON.stringify(value)}`;
            } catch {
              return `- ${key}: [unserializable]`;
            }
          });
          stepGuidanceTurns.push({
            role: 'system',
            content: ['Workflow-collected user inputs (authoritative):', ...lines].join('\n'),
          });
        }

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
        const message = String((error as any)?.message ?? '');
        const lower = message.toLowerCase();
        const isQuotaExceeded =
          getOpenAiQuotaExceededStatus() ||
          lower.includes('quota_exceeded') ||
          lower.includes('monthly quota exceeded') ||
          lower.includes('openai quota exceeded');

        if (isQuotaExceeded) {
          setHasAiQuotaExceeded(true);
          props.onTransportError?.();
          throw error;
        }

        controller.streamAssistantReplyFromWorkflow(
          'kwilt is having trouble responding right now. Try again in a moment, and if it keeps happening you can check your connection in Settings.',
          'assistant-error-workflow'
        );
        props.onTransportError?.();
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[workflow] Failed to invoke agent step', stepId, error);
        }
        throw error;
      }
    },
    [launchContextText, props.onTransportError, workflowDefinition, workflowInstance]
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
      // If we have a claimed ArcDraft payload (from a web → app handoff),
      // auto-submit it into the workflow instead of re-running the survey UI.
      if (arcDraftPayload) {
        return (
          <ArcDraftContinueFlow
            chatControllerRef={chatPaneRef as React.RefObject<ChatTimelineController | null>}
          />
        );
      }
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
          autoRecommendOnMount={launchContext.intent === 'goalCreation'}
        />
      );
    }

    if (workflowDefinition.chatMode === 'shareIntake') {
      return <ShareIntakeFlow />;
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
  // Pro users should not be blocked by quota checks.
  if (!isPro && (aiCreditsRemaining <= 0 || hasAiQuotaExceeded || (!__DEV__ && getOpenAiQuotaExceededStatus()))) {
    const modeLabel = effectiveMode
      ? (WORKFLOW_REGISTRY as Record<string, WorkflowDefinition | undefined>)[effectiveMode]?.label
      : undefined;
    const workflowLabel = workflowDefinition?.label;
    const workflowInfoTitle = modeLabel ?? workflowLabel ?? 'AI coach';
    const workflowInfoSubtitle =
      effectiveMode === 'goalCreation'
        ? 'This coach helps you shape one clear 30–90 day goal inside your life architecture, using any Arc and Goal context the app has already collected.'
        : effectiveMode === 'activityCreation'
        ? 'This coach helps you turn your current goals and arcs into small, concrete activities you can actually do in the near term.'
        : effectiveMode === 'firstTimeOnboarding'
        ? 'This guide helps you define an initial identity direction and aspiration using quick, tap-first inputs.'
        : effectiveMode === 'activityGuidance'
        ? 'This coach helps you clarify the activity, make it smaller, and choose the next best step — using the goal/arc context attached to this activity.'
        : 'This coach adapts to the current workflow and context on this screen so you can move forward with less typing.';

    return (
      <View style={styles.flex}>
        <View style={styles.body}>
          <Dialog
            visible={isWorkflowInfoVisible}
            onClose={() => setIsWorkflowInfoVisible(false)}
            title={workflowInfoTitle}
            description={workflowInfoSubtitle}
          >
            <Text style={styles.workflowInfoBody}>
              {launchContext.source
                ? `Launch source: ${launchContext.source}.`
                : 'This workspace uses the current screen context to personalize responses.'}
            </Text>
          </Dialog>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.timeline}>
              {!props.hideBrandHeader ? (
                <View style={styles.headerRow}>
                  <BrandLockup logoSize={32} wordmarkSize="sm" />
                  <Pressable
                    style={styles.modePill}
                    onPress={() => setIsWorkflowInfoVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="View context"
                  >
                    <Text style={styles.modePillText}>Context</Text>
                    <Icon
                      name="info"
                      size={16}
                      color={colors.textSecondary}
                      style={styles.modePillInfoIcon}
                    />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.paywallCardSlot}>
                <PaywallContent
                  reason="generative_quota_exceeded"
                  source={paywallSource}
                  showHeader={false}
                  onClose={() => {
                    props.onDismiss?.();
                  }}
                  onUpgrade={() => {
                    props.onDismiss?.();
                    // Avoid stacking two Modal-based BottomDrawers (agent closing + pricing opening)
                    // which can leave an invisible backdrop intercepting touches on iOS.
                    setTimeout(() => openPaywallPurchaseEntry(), 360);
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

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
        onAdoptGoalProposal={onAdoptGoalProposal}
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    backgroundColor: colors.canvas,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  timeline: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.canvas,
    alignSelf: 'flex-end',
  },
  modePillInfoIcon: {
    marginLeft: spacing.sm,
  },
  modePillText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  paywallCardSlot: {
    marginTop: spacing['2xl'],
    backgroundColor: colors.canvas,
    borderRadius: 18,
    overflow: 'hidden',
    // BottomDrawer already applies horizontal padding to the whole sheet (the "gutter").
    // Keep the wrapper flush with that gutter, but add inner padding so the paywall
    // content reads like a card within a card (matches Goals → Activities AI).
    marginHorizontal: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  workflowInfoBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
});



