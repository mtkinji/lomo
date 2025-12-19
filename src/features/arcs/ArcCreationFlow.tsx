import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { LongTextField } from '../../ui/LongTextField';
import { QuestionCard } from '../../ui/QuestionCard';
import { Text } from '../../ui/primitives';
import { ButtonLabel } from '../../ui/Typography';
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

  if (step === 'dream') {
    const dreamPlain = htmlToPlainText(dreamInput).trim();
    const hasDream = dreamPlain.length > 0;
    return (
      <QuestionCard
        stepLabel={stepLabel}
        title="Looking ahead, what’s one big thing you’d love to bring to life?"
        style={styles.card}
      >
        <View style={styles.body}>
          <LongTextField
            label="Dream"
            value={dreamInput}
            onChange={setDreamInput}
            hideLabel
            placeholder="e.g., Rewild our back acreage into a native meadow; restore a 1970s 911; build a small timber-frame home."
            snapPoints={['75%']}
          />
          <View style={styles.inlineActions}>
            <Button
              variant="accent"
              style={[styles.primaryButton, !hasDream && styles.primaryButtonDisabled]}
              disabled={!hasDream}
              onPress={() => {
                chatControllerRef?.current?.appendUserMessage(dreamPlain);
                setStep('whyNow');
              }}
            >
              <ButtonLabel size="md" tone="inverse">
                Continue
              </ButtonLabel>
            </Button>
          </View>
        </View>
      </QuestionCard>
    );
  }

  if (step === 'whyNow') {
    return (
      <QuestionCard stepLabel={stepLabel} title="Why does this feel important to you?" style={styles.card}>
        <View style={styles.body}>
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

          <View style={styles.inlineActions}>
            <Button variant="outline" style={styles.secondaryButton} onPress={() => setStep('dream')}>
              <ButtonLabel size="md">Back</ButtonLabel>
            </Button>
          </View>
        </View>
      </QuestionCard>
    );
  }

  if (step === 'roleModelType') {
    return (
      <QuestionCard
        stepLabel={stepLabel}
        title="What kind of people do you look up to?"
        style={styles.card}
      >
        <View style={styles.body}>
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

          <View style={styles.inlineActions}>
            <Button variant="outline" style={styles.secondaryButton} onPress={() => setStep('whyNow')}>
              <ButtonLabel size="md">Back</ButtonLabel>
            </Button>
          </View>
        </View>
      </QuestionCard>
    );
  }

  const canContinue = admiredQualityIds.length > 0 && !submitting;
  return (
    <QuestionCard
      stepLabel={stepLabel}
      title="What qualities do you admire in them? (Pick 1–3)"
      style={styles.card}
    >
      <View style={styles.body}>
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

        <View style={styles.inlineActions}>
          <Button variant="outline" style={styles.secondaryButton} onPress={() => setStep('roleModelType')}>
            <ButtonLabel size="md">Back</ButtonLabel>
          </Button>
          <Button
            variant="accent"
            style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
            disabled={!canContinue}
            onPress={() => {
              const labels = admiredQualityIds
                .map((id) => labelFor(ARCHETYPE_ADMIRED_QUALITIES, id))
                .filter((l): l is string => Boolean(l));
              chatControllerRef?.current?.appendUserMessage(`I admire: ${labels.join(', ')}`);
              void handleSubmit();
            }}
          >
            <ButtonLabel size="md" tone="inverse">
              {submitting ? 'Thinking…' : 'Continue'}
            </ButtonLabel>
          </Button>
        </View>
      </View>
    </QuestionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    // Let AiChatPane's `stepCardHost` control the vertical offset so the card
    // sits directly under the Agent header without extra stacked margins.
    marginTop: 0,
  },
  body: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
  primaryButtonDisabled: {
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
