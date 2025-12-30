import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { SurveyCard, type SurveyStep } from '../../ui/SurveyCard';
import { ButtonLabel } from '../../ui/Typography';
import { HStack, Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';
import type { ChatTimelineController } from '../ai/AiChatScreen';
import type { ArchetypeAdmiredQualityId, ArchetypeRoleModelTypeId } from '../../domain/archetypeTaps';
import { ARCHETYPE_ADMIRED_QUALITIES, ARCHETYPE_ROLE_MODEL_TYPES } from '../../domain/archetypeTaps';
import { DOMAIN_OPTIONS, MOTIVATION_OPTIONS, PROUD_MOMENT_OPTIONS, WHY_NOW_OPTIONS } from '../../domain/arcCreationSurveyOptions';
import { htmlToPlainText } from '../../ui/richText';
import { ARC_CREATION_SURVEY_COPY, ARC_CREATION_SURVEY_STEP_ORDER, type ArcCreationSurveyStepId } from './arcCreationSurvey';

type ArcCreationFlowProps = {
  /**
   * Optional handle to the shared chat surface. This flow treats the chat
   * controller as its only link to the visible thread: it can mirror user
   * answers into the transcript, but it never mounts its own chat UI.
   */
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
};

function labelFor<T extends { id: string; label: string }>(options: T[], id: string | null | undefined) {
  if (!id) return null;
  return options.find((o) => o.id === id)?.label ?? null;
}

/**
 * Direct Arc creation flow (post-FTUE).
 *
 * This intentionally mirrors the FTUE Arc-creation subflow (reuseIdentityForNewArc):
 * dream → why now (tap) → role model type (tap) → admired qualities (pick 1–3).
 *
 * The only thing we omit vs FTUE is the longer identity-collection steps and intro.
 */
export function ArcCreationFlow({ chatControllerRef }: ArcCreationFlowProps) {
  const workflowRuntime = useWorkflowRuntime();

  const definition = workflowRuntime?.definition;
  const instance = workflowRuntime?.instance;

  const isArcCreationWorkflow = definition?.chatMode === 'arcCreation';
  const currentStepId = instance?.currentStepId;

  const isContextStepActive =
    isArcCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const [submitting, setSubmitting] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const currentSurveyStepId = (ARC_CREATION_SURVEY_STEP_ORDER[stepIndex] ?? 'dreams') as ArcCreationSurveyStepId;
  const stepLabel = useMemo(() => `${stepIndex + 1} of ${ARC_CREATION_SURVEY_STEP_ORDER.length}`, [stepIndex]);

  const [dreamInput, setDreamInput] = useState('');
  const [whyNowId, setWhyNowId] = useState<string | null>(null);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [proudMomentId, setProudMomentId] = useState<string | null>(null);
  const [motivationId, setMotivationId] = useState<string | null>(null);
  const [roleModelTypeId, setRoleModelTypeId] = useState<ArchetypeRoleModelTypeId | null>(null);
  const [admiredQualityIds, setAdmiredQualityIds] = useState<ArchetypeAdmiredQualityId[]>([]);

  const toggleAdmiredQuality = useCallback((id: ArchetypeAdmiredQualityId) => {
    setAdmiredQualityIds((current) => {
      if (current.includes(id)) {
        return current.filter((q) => q !== id);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, id];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!workflowRuntime || !isArcCreationWorkflow) return;

    const trimmedDream = htmlToPlainText(dreamInput).trim();
    if (!trimmedDream) return;
    // whyNow is optional by design; don't block submission.
    if (!roleModelTypeId) return;
    if (!domainId) return;
    if (!proudMomentId) return;
    if (!motivationId) return;
    if (admiredQualityIds.length === 0) return;

    const whyNowLabel = WHY_NOW_OPTIONS.find((o) => o.id === whyNowId)?.label ?? null;
    const domainOption = DOMAIN_OPTIONS.find((o) => o.id === domainId) ?? null;
    const domainLabel = domainOption?.label ?? null;
    const domainLabelForChat = domainOption?.emoji ? `${domainOption.emoji} ${domainOption.label}` : domainLabel;
    const proudMomentLabel = labelFor(PROUD_MOMENT_OPTIONS, proudMomentId);
    const motivationLabel = labelFor(MOTIVATION_OPTIONS, motivationId);
    const roleModelTypeLabel = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, roleModelTypeId);
    const admiredLabels = admiredQualityIds
      .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
      .filter((l): l is string => Boolean(l));

    // Mirror one compact summary into the visible transcript so the agent step
    // sees the structured survey answers without relying on per-step appends
    // (avoids duplicate/contradictory signals if the user goes back and changes answers).
    const controller = chatControllerRef?.current;
    if (controller) {
      const lines = [
        `Dream: ${trimmedDream}`,
        whyNowLabel ? `Why now: ${whyNowLabel}` : null,
        domainLabelForChat ? `Domain: ${domainLabelForChat}` : null,
        proudMomentLabel ? `Proud moment: ${proudMomentLabel}` : null,
        motivationLabel ? `Motivation: ${motivationLabel}` : null,
        roleModelTypeLabel ? `People I look up to: ${roleModelTypeLabel}` : null,
        admiredLabels.length ? `I admire: ${admiredLabels.join(', ')}` : null,
      ].filter((l): l is string => Boolean(l));
      controller.appendUserMessage(lines.join('\n'));
    }

    workflowRuntime.completeStep('context_collect', {
      prompt: trimmedDream,
      whyNow: whyNowLabel,
      domain: domainLabel,
      proudMoment: proudMomentLabel,
      motivation: motivationLabel,
      roleModelType: roleModelTypeLabel,
      admiredQualities: admiredLabels.length ? admiredLabels : null,
    });

    try {
      setSubmitting(true);
      await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_arc' });
    } finally {
      setSubmitting(false);
    }
  }, [
    admiredQualityIds,
    chatControllerRef,
    domainId,
    dreamInput,
    isArcCreationWorkflow,
    motivationId,
    proudMomentId,
    roleModelTypeId,
    whyNowId,
    workflowRuntime,
  ]);

  const steps = useMemo<SurveyStep[]>(() => {
    const dreamPlain = htmlToPlainText(dreamInput).trim();
    const hasDream = dreamPlain.length > 0;
    const canSubmit = admiredQualityIds.length > 0 && !submitting;

    return [
      {
        id: 'dreams',
        title: ARC_CREATION_SURVEY_COPY.dreamsTitle,
        canProceed: hasDream,
        render: () => (
          <Input
            value={dreamInput}
            onChangeText={setDreamInput}
            multiline
            // Match FTUE behavior: stable textarea height to avoid growing off-screen
            // while placeholder/content size changes.
            multilineMinHeight={140}
            multilineMaxHeight={140}
            placeholder={ARC_CREATION_SURVEY_COPY.dreamsPlaceholder}
            autoCapitalize="sentences"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        ),
      },
      {
        id: 'whyNow',
        title: ARC_CREATION_SURVEY_COPY.whyNowTitle,
        // Optional: always allow proceeding.
        canProceed: true,
        render: () => (
          <View style={styles.fullWidthList}>
            {WHY_NOW_OPTIONS.map((option) => {
              const selected = whyNowId === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setWhyNowId(option.id);
                    setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
                  }}
                >
                  <View style={styles.fullWidthOptionContent}>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.fullWidthOptionLabel,
                        selected && styles.fullWidthOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <View style={styles.whyNowFooterRow}>
              <Button
                variant="ghost"
                onPress={() => setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1))}
                accessibilityLabel={ARC_CREATION_SURVEY_COPY.skipWhyNowLabel}
              >
                <ButtonLabel size="md">{ARC_CREATION_SURVEY_COPY.skipWhyNowLabel}</ButtonLabel>
              </Button>
            </View>
          </View>
        ),
      },
      {
        id: 'domain',
        title: ARC_CREATION_SURVEY_COPY.domainTitle,
        canProceed: Boolean(domainId),
        render: () => (
          <View style={styles.fullWidthList}>
            {DOMAIN_OPTIONS.map((option) => {
              const selected = domainId === option.id;
              const labelWithEmoji = option.emoji ? `${option.emoji} ${option.label}` : option.label;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setDomainId(option.id);
                    setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
                  }}
                >
                  <View style={styles.fullWidthOptionContent}>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.fullWidthOptionLabel,
                        selected && styles.fullWidthOptionLabelSelected,
                      ]}
                    >
                      {labelWithEmoji}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ),
      },
      {
        id: 'proudMoment',
        title: ARC_CREATION_SURVEY_COPY.proudMomentTitle,
        canProceed: Boolean(proudMomentId),
        render: () => (
          <View style={styles.fullWidthList}>
            {PROUD_MOMENT_OPTIONS.map((option) => {
              const selected = proudMomentId === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setProudMomentId(option.id);
                    setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
                  }}
                >
                  <View style={styles.fullWidthOptionContent}>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.fullWidthOptionLabel,
                        selected && styles.fullWidthOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ),
      },
      {
        id: 'motivation',
        title: ARC_CREATION_SURVEY_COPY.motivationTitle,
        canProceed: Boolean(motivationId),
        render: () => (
          <View style={styles.fullWidthList}>
            {MOTIVATION_OPTIONS.map((option) => {
              const selected = motivationId === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setMotivationId(option.id);
                    setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
                  }}
                >
                  <View style={styles.fullWidthOptionContent}>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.fullWidthOptionLabel,
                        selected && styles.fullWidthOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ),
      },
      {
        id: 'roleModelType',
        title: ARC_CREATION_SURVEY_COPY.roleModelTypeTitle,
        canProceed: Boolean(roleModelTypeId),
        render: () => (
          <View style={styles.fullWidthList}>
            {ARCHETYPE_ROLE_MODEL_TYPES.map((option) => {
              const selected = roleModelTypeId === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setRoleModelTypeId(option.id);
                    setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
                  }}
                >
                  <View style={styles.fullWidthOptionContent}>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.fullWidthOptionLabel,
                        selected && styles.fullWidthOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ),
      },
      {
        id: 'admiredQualities',
        title: ARC_CREATION_SURVEY_COPY.admiredQualitiesTitle,
        canProceed: canSubmit,
        render: () => (
          <View style={styles.fullWidthList}>
            {ARCHETYPE_ADMIRED_QUALITIES.map((option) => {
              const selected = admiredQualityIds.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleAdmiredQuality(option.id)}
                >
                  <View style={styles.fullWidthOptionContent}>
                    <View style={[styles.checkboxOuter, selected && styles.checkboxOuterSelected]}>
                      {selected ? <Icon name="check" size={14} color={colors.canvas} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.fullWidthOptionLabel,
                        selected && styles.fullWidthOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ),
      },
    ];
  }, [
    admiredQualityIds,
    chatControllerRef,
    dreamInput,
    domainId,
    motivationId,
    proudMomentId,
    roleModelTypeId,
    submitting,
    toggleAdmiredQuality,
    whyNowId,
  ]);

  if (!isContextStepActive) {
    return null;
  }

  const currentStep = steps[stepIndex];
  const canProceed = currentStep?.canProceed ?? true;
  const isPrimaryDisabled = !canProceed;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <SurveyCard
      variant="stacked"
      steps={steps}
      currentStepIndex={stepIndex}
      stepLabel={stepLabel}
      nextLabel="Continue"
      submitLabel={submitting ? 'Thinking…' : 'Continue'}
      footerRight={
        <HStack alignItems="center" justifyContent="flex-end" space="sm">
          {!isFirst ? (
            <Button variant="ghost" onPress={() => {
              setStepIndex((idx) => Math.max(0, idx - 1));
            }} accessibilityLabel="Back">
              <ButtonLabel size="md">Back</ButtonLabel>
            </Button>
          ) : null}
          <Button
            variant="primary"
            disabled={isPrimaryDisabled}
            style={isPrimaryDisabled ? styles.primaryDisabled : undefined}
            onPress={isLast ? (() => {
              if (submitting) return;
              void handleSubmit();
            }) : (() => {
              if (currentSurveyStepId === 'dreams') {
                const dreamPlain = htmlToPlainText(dreamInput).trim();
                if (!dreamPlain) return;
                setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
                return;
              }
              setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
            })}
            accessibilityLabel="Continue"
          >
            <ButtonLabel size="md" tone={isPrimaryDisabled ? 'muted' : 'inverse'}>
              {isLast ? (submitting ? 'Thinking…' : 'Continue') : 'Continue'}
            </ButtonLabel>
          </Button>
        </HStack>
      }
      onBack={() => {
        setStepIndex((idx) => Math.max(0, idx - 1));
      }}
      onNext={() => {
        if (currentSurveyStepId === 'dreams') {
          const dreamPlain = htmlToPlainText(dreamInput).trim();
          if (!dreamPlain) return;
          setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
          return;
        }
        setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
      }}
      onSubmit={() => {
        if (submitting) return;
        void handleSubmit();
      }}
      style={styles.surveyCard}
    />
  );
}

const styles = StyleSheet.create({
  surveyCard: {
    // Let AiChatPane's `stepCardHost` control the vertical offset so the card
    // sits directly under the Agent header without extra stacked margins.
    marginTop: 0,
    paddingVertical: 0,
  },
  primaryDisabled: {
    opacity: 0.5,
  },
  fullWidthList: {
    gap: spacing.sm,
  },
  fullWidthOption: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fullWidthOptionSelected: {
    borderColor: colors.turmeric,
  },
  fullWidthOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.md,
  },
  fullWidthOptionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  fullWidthOptionLabelSelected: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.turmeric,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.turmeric,
  },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxOuterSelected: {
    borderColor: colors.turmeric,
    backgroundColor: colors.turmeric,
  },
  whyNowFooterRow: {
    alignItems: 'flex-start',
    paddingTop: spacing.xs,
  },
});
