import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  ARCHETYPE_ADMIRED_QUALITIES,
  ARCHETYPE_ROLE_MODEL_TYPES,
  DOMAIN_OPTIONS,
  MOTIVATION_OPTIONS,
  PROUD_MOMENT_OPTIONS,
  WHY_NOW_OPTIONS,
  type ArcDraftPayload,
} from '@kwilt/arc-survey';
import { Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';
import { useArcDraftClaimStore } from '../../store/useArcDraftClaimStore';

type ArcDraftContinueFlowProps = {
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
};

function labelFor<T extends { id: string; label: string }>(options: T[], id: string | null | undefined) {
  if (!id) return null;
  return options.find((o) => o.id === id)?.label ?? null;
}

function summarizeForChat(payload: ArcDraftPayload): string {
  const whyNowLabel = WHY_NOW_OPTIONS.find((o) => o.id === payload.whyNowId)?.label ?? null;
  const domainOption = DOMAIN_OPTIONS.find((o) => o.id === payload.domainId) ?? null;
  const domainLabel = domainOption?.label ?? null;
  const domainLabelForChat = domainOption?.emoji ? `${domainOption.emoji} ${domainOption.label}` : domainLabel;
  const proudMomentLabel = labelFor(PROUD_MOMENT_OPTIONS, payload.proudMomentId);
  const motivationLabel = labelFor(MOTIVATION_OPTIONS, payload.motivationId);
  const roleModelTypeLabel = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, payload.roleModelTypeId);
  const admiredLabels = payload.admiredQualityIds
    .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
    .filter((l): l is string => Boolean(l));

  const lines = [
    `Dream: ${payload.dream.trim()}`,
    whyNowLabel ? `Why now: ${whyNowLabel}` : null,
    domainLabelForChat ? `Domain: ${domainLabelForChat}` : null,
    proudMomentLabel ? `Proud moment: ${proudMomentLabel}` : null,
    motivationLabel ? `Motivation: ${motivationLabel}` : null,
    roleModelTypeLabel ? `People I look up to: ${roleModelTypeLabel}` : null,
    admiredLabels.length ? `I admire: ${admiredLabels.join(', ')}` : null,
  ].filter((l): l is string => Boolean(l));

  return lines.join('\\n');
}

export function ArcDraftContinueFlow({ chatControllerRef }: ArcDraftContinueFlowProps) {
  const workflowRuntime = useWorkflowRuntime();
  const didSubmitRef = useRef(false);
  const payload = useArcDraftClaimStore((s) => s.payload);

  const isArcCreationWorkflow = workflowRuntime?.definition?.chatMode === 'arcCreation';
  const currentStepId = workflowRuntime?.instance?.currentStepId;
  const isContextStepActive = isArcCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const summary = useMemo(() => (payload ? summarizeForChat(payload) : ''), [payload]);

  useEffect(() => {
    if (!workflowRuntime) return;
    if (!payload) return;
    if (!isContextStepActive) return;
    if (didSubmitRef.current) return;

    didSubmitRef.current = true;

    const whyNowLabel = WHY_NOW_OPTIONS.find((o) => o.id === payload.whyNowId)?.label ?? null;
    const domainLabel = DOMAIN_OPTIONS.find((o) => o.id === payload.domainId)?.label ?? null;
    const proudMomentLabel = labelFor(PROUD_MOMENT_OPTIONS, payload.proudMomentId);
    const motivationLabel = labelFor(MOTIVATION_OPTIONS, payload.motivationId);
    const roleModelTypeLabel = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, payload.roleModelTypeId);
    const admiredLabels = payload.admiredQualityIds
      .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
      .filter((l): l is string => Boolean(l));

    // Mirror compact summary into transcript (same approach as ArcCreationFlow).
    const controller = chatControllerRef?.current;
    if (controller) {
      controller.appendUserMessage(summary);
    }

    workflowRuntime.completeStep('context_collect', {
      prompt: payload.dream.trim(),
      whyNow: whyNowLabel,
      domain: domainLabel,
      proudMoment: proudMomentLabel,
      motivation: motivationLabel,
      roleModelType: roleModelTypeLabel,
      admiredQualities: admiredLabels.length ? admiredLabels : null,
    });

    // Clear the claimed payload so revisiting this screen doesn't re-submit.
    useArcDraftClaimStore.getState().clear();

    void workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_arc' });
  }, [chatControllerRef, isContextStepActive, payload, summary, workflowRuntime]);

  if (!payload) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Preparing your Arc…</Text>
        <Text style={styles.body}>We didn’t find an Arc draft to continue.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ActivityIndicator color={colors.textSecondary} />
        <Text style={styles.title}>Shaping your Arc…</Text>
      </View>
      <Text style={styles.body}>Using your answers from the survey to propose a first Arc.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


