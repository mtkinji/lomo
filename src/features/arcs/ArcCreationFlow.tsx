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
import { htmlToPlainText } from '../../ui/richText';

type ArcCreationFlowProps = {
  /**
   * Optional handle to the shared chat surface. This flow treats the chat
   * controller as its only link to the visible thread: it can mirror user
   * answers into the transcript, but it never mounts its own chat UI.
   */
  chatControllerRef?: React.RefObject<ChatTimelineController | null>;
};

type ChoiceOption = { id: string; label: string };

// Keep this aligned with `WHY_NOW_OPTIONS` in `IdentityAspirationFlow` (reuseIdentityForNewArc).
const WHY_NOW_OPTIONS: ChoiceOption[] = [
  { id: 'excited_and_serious', label: "I’m excited about this and want to take it seriously." },
  { id: 'fits_future_me', label: "It fits who I’m trying to become." },
  { id: 'keeps_returning', label: 'It keeps coming back to me.' },
  { id: 'change_for_good', label: 'It would really change things in a good way.' },
  { id: 'bigger_than_me', label: 'It’s about more than just me.' },
];

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

  const [step, setStep] = useState<'dream' | 'whyNow' | 'roleModelType' | 'admiredQualities'>(
    'dream',
  );
  const stepLabel = useMemo(() => {
    const index = step === 'dream' ? 1 : step === 'whyNow' ? 2 : step === 'roleModelType' ? 3 : 4;
    return `${index} of 4`;
  }, [step]);
  const currentStepIndex = useMemo(() => {
    return step === 'dream' ? 0 : step === 'whyNow' ? 1 : step === 'roleModelType' ? 2 : 3;
  }, [step]);

  const [dreamInput, setDreamInput] = useState('');
  const [whyNowId, setWhyNowId] = useState<string | null>(null);
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
    if (!whyNowId) return;
    if (!roleModelTypeId) return;
    if (admiredQualityIds.length === 0) return;

    const whyNowLabel = WHY_NOW_OPTIONS.find((o) => o.id === whyNowId)?.label ?? null;
    const roleModelTypeLabel = labelFor(ARCHETYPE_ROLE_MODEL_TYPES, roleModelTypeId);
    const admiredLabels = admiredQualityIds
      .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
      .filter((l): l is string => Boolean(l));

    workflowRuntime.completeStep('context_collect', {
      prompt: trimmedDream,
      whyNow: whyNowLabel,
      roleModelType: roleModelTypeLabel,
      admiredQualities: admiredLabels.length ? admiredLabels : null,
    });

    try {
      setSubmitting(true);
      await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_arc' });
    } finally {
      setSubmitting(false);
    }
  }, [admiredQualityIds, dreamInput, isArcCreationWorkflow, roleModelTypeId, whyNowId, workflowRuntime]);

  if (!isContextStepActive) {
    return null;
  }

  const steps = useMemo<SurveyStep[]>(() => {
    const dreamPlain = htmlToPlainText(dreamInput).trim();
    const hasDream = dreamPlain.length > 0;
    const canSubmit = admiredQualityIds.length > 0 && !submitting;

    return [
      {
        id: 'dream',
        title: "Looking ahead, what’s one big thing you’d love to bring to life?",
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
            placeholder="e.g., Rewild our back acreage into a native meadow; restore a 1970s 911; build a small timber-frame home."
            autoCapitalize="sentences"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        ),
      },
      {
        id: 'whyNow',
        title: 'Why does this feel important to you?',
        canProceed: Boolean(whyNowId),
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
                    chatControllerRef?.current?.appendUserMessage(option.label);
                    setStep('roleModelType');
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
        title: 'What kind of people do you look up to?',
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
                    chatControllerRef?.current?.appendUserMessage(`People I look up to: ${option.label}`);
                    setStep('admiredQualities');
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
        title: 'What qualities do you admire in them? (Pick 1–3)',
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
    roleModelTypeId,
    submitting,
    toggleAdmiredQuality,
    whyNowId,
  ]);

  const currentStep = steps[currentStepIndex];
  const canProceed = currentStep?.canProceed ?? true;
  const isPrimaryDisabled = !canProceed;
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  return (
    <SurveyCard
      variant="stacked"
      steps={steps}
      currentStepIndex={currentStepIndex}
      stepLabel={stepLabel}
      nextLabel="Continue"
      submitLabel={submitting ? 'Thinking…' : 'Continue'}
      footerRight={
        <HStack alignItems="center" justifyContent="flex-end" space="sm">
          {!isFirst ? (
            <Button variant="ghost" onPress={() => {
              setStep((current) =>
                current === 'admiredQualities'
                  ? 'roleModelType'
                  : current === 'roleModelType'
                    ? 'whyNow'
                    : current === 'whyNow'
                      ? 'dream'
                      : 'dream',
              );
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
              const labels = admiredQualityIds
                .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
                .filter((l): l is string => Boolean(l));
              if (labels.length === 0) return;
              chatControllerRef?.current?.appendUserMessage(`I admire: ${labels.join(', ')}`);
              void handleSubmit();
            }) : (() => {
              if (step === 'dream') {
                const dreamPlain = htmlToPlainText(dreamInput).trim();
                if (!dreamPlain) return;
                chatControllerRef?.current?.appendUserMessage(dreamPlain);
                setStep('whyNow');
                return;
              }
              if (step === 'whyNow') {
                if (!whyNowId) return;
                setStep('roleModelType');
                return;
              }
              if (step === 'roleModelType') {
                if (!roleModelTypeId) return;
                setStep('admiredQualities');
              }
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
        setStep((current) =>
          current === 'admiredQualities'
            ? 'roleModelType'
            : current === 'roleModelType'
              ? 'whyNow'
              : current === 'whyNow'
                ? 'dream'
                : 'dream',
        );
      }}
      onNext={() => {
        if (step === 'dream') {
          const dreamPlain = htmlToPlainText(dreamInput).trim();
          if (!dreamPlain) return;
          chatControllerRef?.current?.appendUserMessage(dreamPlain);
          setStep('whyNow');
          return;
        }
        if (step === 'whyNow') {
          if (!whyNowId) return;
          setStep('roleModelType');
          return;
        }
        if (step === 'roleModelType') {
          if (!roleModelTypeId) return;
          setStep('admiredQualities');
        }
      }}
      onSubmit={() => {
        if (submitting) return;
        const labels = admiredQualityIds
          .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
          .filter((l): l is string => Boolean(l));
        if (labels.length === 0) return;
        chatControllerRef?.current?.appendUserMessage(`I admire: ${labels.join(', ')}`);
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
});
