import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager } from 'react-native';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { useFeatureFlag } from '../../services/analytics/useFeatureFlag';
import { getInstallId } from '../../services/installId';
import { useAppStore } from '../../store/useAppStore';
import {
  getWorkflowFeedbackPrompt,
  responseBandForValue,
  type WorkflowFeedbackPlacement,
  type WorkflowFeedbackPrompt,
  type WorkflowFeedbackPromptId,
  type WorkflowFeedbackValue,
} from './workflowFeedbackRegistry';
import { evaluateWorkflowFeedbackEligibility } from './workflowFeedbackPolicy';
import {
  recordWorkflowFeedbackDismissed,
  recordWorkflowFeedbackEncounter,
  recordWorkflowFeedbackShown,
  recordWorkflowFeedbackSubmitted,
  type WorkflowFeedbackIdentity,
} from './workflowFeedbackStorage';

const REQUEST_EXPIRY_MS = 30_000;

export type WorkflowFeedbackRequest = Readonly<{
  promptId: WorkflowFeedbackPromptId;
  sourceKey: string;
  placement: WorkflowFeedbackPlacement;
}>;

export type WorkflowFeedbackHandle = Readonly<{ cancel: () => void }>;

type RequestEnvelope = {
  token: string;
  request: WorkflowFeedbackRequest;
  cancelled: boolean;
};

let requestListener: ((envelope: RequestEnvelope) => void) | null = null;
let requestCounter = 0;

export function requestWorkflowFeedback(request: WorkflowFeedbackRequest): WorkflowFeedbackHandle {
  const sourceKey = request.sourceKey.trim();
  if (!sourceKey) throw new Error('Workflow feedback sourceKey is required.');
  const envelope: RequestEnvelope = {
    token: `workflow-feedback-request-${++requestCounter}`,
    request: { ...request, sourceKey },
    cancelled: false,
  };
  requestListener?.(envelope);
  return {
    cancel: () => {
      envelope.cancelled = true;
    },
  };
}

export type WorkflowFeedbackPresentation = Readonly<{
  instanceId: string;
  prompt: WorkflowFeedbackPrompt;
  sourceKey: string;
  placement: WorkflowFeedbackPlacement;
  responseValue: WorkflowFeedbackValue | null;
}>;

export type WorkflowFeedbackRuntimeValue = Readonly<{
  active: WorkflowFeedbackPresentation | null;
  submit: (value: WorkflowFeedbackValue) => void;
  submitReason: (reasonCode: string) => void;
  dismiss: () => void;
  complete: () => void;
}>;

const WorkflowFeedbackRuntimeContext = createContext<WorkflowFeedbackRuntimeValue | null>(null);

export function useWorkflowFeedbackRuntime(): WorkflowFeedbackRuntimeValue {
  const value = useContext(WorkflowFeedbackRuntimeContext);
  if (!value) throw new Error('WorkflowFeedbackProvider is missing.');
  return value;
}

type PendingPresentation = {
  envelope: RequestEnvelope;
  prompt: WorkflowFeedbackPrompt;
  identity: WorkflowFeedbackIdentity;
  interaction?: ReturnType<typeof InteractionManager.runAfterInteractions>;
  expiry?: ReturnType<typeof setTimeout>;
};

function promptStorageKey(prompt: WorkflowFeedbackPrompt): string {
  return `${prompt.promptId}:v${prompt.questionVersion}`;
}

function analyticsProps(presentation: WorkflowFeedbackPresentation) {
  const { prompt } = presentation;
  return {
    feedback_instance_id: presentation.instanceId,
    prompt_id: prompt.promptId,
    question_category: prompt.category,
    question_version: prompt.questionVersion,
    capability_id: prompt.capabilityId,
    workflow_id: prompt.workflowId,
    checkpoint_id: prompt.checkpointId,
    invocation_kind: prompt.invocationKind,
    sampling_policy_version: 1,
    outcome_class: prompt.outcomeClass,
  };
}

export function WorkflowFeedbackProvider({ children }: { children: ReactNode }) {
  const { capture } = useAnalytics();
  const enabled = useFeatureFlag('workflow-experience-pulse-v1', false);
  const screenTimeEnabled = useFeatureFlag('workflow-experience-pulse-screen-time-v1', false);
  const userId = useAppStore((state) => state.authIdentity?.userId?.trim() ?? null);
  const [identity, setIdentity] = useState<WorkflowFeedbackIdentity | null>(null);
  const [active, setActive] = useState<WorkflowFeedbackPresentation | null>(null);

  const identityRef = useRef(identity);
  const activeRef = useRef(active);
  const enabledRef = useRef(enabled);
  const screenTimeEnabledRef = useRef(screenTimeEnabled);
  const sessionHasShownRef = useRef(false);
  const pendingRef = useRef<PendingPresentation | null>(null);
  const queueRef = useRef(Promise.resolve());
  const ratedInstancesRef = useRef(new Set<string>());
  const followupInstancesRef = useRef(new Set<string>());

  useEffect(() => { identityRef.current = identity; }, [identity]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { screenTimeEnabledRef.current = screenTimeEnabled; }, [screenTimeEnabled]);

  useEffect(() => {
    let cancelled = false;
    const currentPending = pendingRef.current;
    currentPending?.interaction?.cancel();
    if (currentPending?.expiry) clearTimeout(currentPending.expiry);
    pendingRef.current = null;
    setActive(null);
    activeRef.current = null;

    if (userId) {
      setIdentity({ kind: 'user', id: userId });
      return () => { cancelled = true; };
    }
    setIdentity(null);
    void getInstallId().then((installId) => {
      if (!cancelled) setIdentity({ kind: 'install', id: installId });
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const present = async (pending: PendingPresentation) => {
      if (
        pendingRef.current !== pending
        || pending.envelope.cancelled
        || sessionHasShownRef.current
        || activeRef.current
        || identityRef.current?.kind !== pending.identity.kind
        || identityRef.current?.id !== pending.identity.id
      ) return;

      if (pending.expiry) clearTimeout(pending.expiry);
      pendingRef.current = null;
      const presentation: WorkflowFeedbackPresentation = {
        instanceId: Crypto.randomUUID(),
        prompt: pending.prompt,
        sourceKey: pending.envelope.request.sourceKey,
        placement: pending.prompt.placement,
        responseValue: null,
      };
      await recordWorkflowFeedbackShown(pending.identity, new Date().toISOString());
      if (pending.envelope.cancelled || sessionHasShownRef.current || activeRef.current) return;
      sessionHasShownRef.current = true;
      activeRef.current = presentation;
      setActive(presentation);
      capture(AnalyticsEvent.WorkflowFeedbackShown, analyticsProps(presentation));
    };

    requestListener = (envelope) => {
      queueRef.current = queueRef.current.then(async () => {
        const currentIdentity = identityRef.current;
        if (!currentIdentity || envelope.cancelled) return;
        const prompt = getWorkflowFeedbackPrompt(envelope.request.promptId);
        const key = promptStorageKey(prompt);
        const state = await recordWorkflowFeedbackEncounter(currentIdentity, key);
        if (envelope.cancelled || activeRef.current || pendingRef.current) return;
        const decision = evaluateWorkflowFeedbackEligibility({
          nowIso: new Date().toISOString(),
          promptKey: key,
          minimumEncounterCount: prompt.minimumEncounterCount,
          state,
          sessionHasShown: sessionHasShownRef.current,
          enabled: enabledRef.current,
          screenTimeEnabled: screenTimeEnabledRef.current,
          capabilityId: prompt.capabilityId,
        });
        if (!decision.eligible || envelope.request.placement !== prompt.placement) return;

        const pending: PendingPresentation = { envelope, prompt, identity: currentIdentity };
        pendingRef.current = pending;
        pending.expiry = setTimeout(() => {
          if (pendingRef.current !== pending) return;
          pending.interaction?.cancel();
          pendingRef.current = null;
        }, REQUEST_EXPIRY_MS);
        pending.interaction = InteractionManager.runAfterInteractions(() => {
          void present(pending);
        });
      }).catch(() => undefined);
    };

    return () => {
      if (requestListener) requestListener = null;
      const pending = pendingRef.current;
      pending?.interaction?.cancel();
      if (pending?.expiry) clearTimeout(pending.expiry);
      pendingRef.current = null;
    };
  }, [capture]);

  const submit = useCallback((value: WorkflowFeedbackValue) => {
    const presentation = activeRef.current;
    const currentIdentity = identityRef.current;
    if (!presentation || !currentIdentity || ratedInstancesRef.current.has(presentation.instanceId)) return;
    ratedInstancesRef.current.add(presentation.instanceId);
    const next = { ...presentation, responseValue: value };
    activeRef.current = next;
    setActive(next);
    capture(AnalyticsEvent.WorkflowFeedbackSubmitted, {
      ...analyticsProps(presentation),
      response_value: value,
      response_band: responseBandForValue(value),
    });
    void recordWorkflowFeedbackSubmitted(
      currentIdentity,
      promptStorageKey(presentation.prompt),
      new Date().toISOString(),
    );
  }, [capture]);

  const submitReason = useCallback((reasonCode: string) => {
    const presentation = activeRef.current;
    if (
      !presentation
      || presentation.responseValue === null
      || presentation.responseValue > 3
      || followupInstancesRef.current.has(presentation.instanceId)
      || !presentation.prompt.reasons.some((reason) => reason.code === reasonCode)
    ) return;
    followupInstancesRef.current.add(presentation.instanceId);
    capture(AnalyticsEvent.WorkflowFeedbackFollowupSubmitted, {
      ...analyticsProps(presentation),
      response_value: presentation.responseValue,
      response_band: responseBandForValue(presentation.responseValue),
      reason_code: reasonCode,
    });
  }, [capture]);

  const complete = useCallback(() => {
    activeRef.current = null;
    setActive(null);
  }, []);

  const dismiss = useCallback(() => {
    const presentation = activeRef.current;
    const currentIdentity = identityRef.current;
    if (!presentation || !currentIdentity) return;
    if (!ratedInstancesRef.current.has(presentation.instanceId)) {
      capture(AnalyticsEvent.WorkflowFeedbackDismissed, analyticsProps(presentation));
      void recordWorkflowFeedbackDismissed(
        currentIdentity,
        promptStorageKey(presentation.prompt),
        new Date().toISOString(),
      );
    }
    activeRef.current = null;
    setActive(null);
  }, [capture]);

  const value = useMemo<WorkflowFeedbackRuntimeValue>(() => ({
    active,
    submit,
    submitReason,
    dismiss,
    complete,
  }), [active, complete, dismiss, submit, submitReason]);

  return (
    <WorkflowFeedbackRuntimeContext.Provider value={value}>
      {children}
    </WorkflowFeedbackRuntimeContext.Provider>
  );
}
