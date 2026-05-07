import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import {
  ARC_CREATION_SURVEY_COPY,
  ARC_CREATION_SURVEY_STEP_ORDER,
  buildArcGenerationInputFromSurveyV2,
  driftPatternOptions,
  getHowThisShowsUpOptions,
  identityDirectionOptions,
  personalTextureToneOptions,
  practiceStyleOptions,
  primaryArenaOptions,
  whyNowOptions,
  type ArcCreationSurveyStepId,
  type ArcSurveyOption,
  type ArcSurveyV2Response,
  type DriftPatternKey,
  type HowThisShowsUpOption,
  type IdentityDirectionKey,
  type PersonalTextureTonePreference,
  type PracticeStyleKey,
  type PrimaryArenaKey,
  type WhyNowKey,
} from '@kwilt/arc-survey';
import { HapticsService } from '../../services/HapticsService';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { SurveyCard, type SurveyStep } from '../../ui/SurveyCard';
import { ButtonLabel } from '../../ui/Typography';
import { HStack, Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { useWorkflowRuntime } from '../ai/WorkflowRuntimeContext';

function findOption<TKey extends string>(
  options: Array<ArcSurveyOption<TKey>>,
  key: TKey | null | undefined
) {
  if (!key) return null;
  return options.find((option) => option.key === key) ?? null;
}

function selectedCustomTextRequired(options: ArcSurveyOption[], selectedKeys: string[]) {
  return selectedKeys.some((key) => options.find((option) => option.key === key)?.allowsCustomText);
}

/**
 * Direct Arc creation flow (post-FTUE).
 *
 * Uses the shared Arc Survey v2 contract so regular creation and first-time
 * onboarding feed the same structured signal into Arc proposal generation.
 */
export function ArcCreationFlow() {
  const workflowRuntime = useWorkflowRuntime();

  const definition = workflowRuntime?.definition;
  const instance = workflowRuntime?.instance;

  const isArcCreationWorkflow = definition?.chatMode === 'arcCreation';
  const currentStepId = instance?.currentStepId;

  const isContextStepActive =
    isArcCreationWorkflow && (currentStepId === 'context_collect' || !currentStepId);

  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentSurveyStepId = (ARC_CREATION_SURVEY_STEP_ORDER[stepIndex] ??
    'identityDirection') as ArcCreationSurveyStepId;
  const stepLabel = useMemo(() => `${stepIndex + 1} of ${ARC_CREATION_SURVEY_STEP_ORDER.length}`, [stepIndex]);

  const [identityDirectionKey, setIdentityDirectionKey] = useState<IdentityDirectionKey | null>(null);
  const [identityDirectionCustomText, setIdentityDirectionCustomText] = useState('');
  const [primaryArenaKey, setPrimaryArenaKey] = useState<PrimaryArenaKey | null>(null);
  const [primaryArenaCustomText, setPrimaryArenaCustomText] = useState('');
  const [whyNowKey, setWhyNowKey] = useState<WhyNowKey | null>(null);
  const [howThisShowsUpKeys, setHowThisShowsUpKeys] = useState<string[]>([]);
  const [howThisShowsUpCustomText, setHowThisShowsUpCustomText] = useState('');
  const [driftPatternKeys, setDriftPatternKeys] = useState<DriftPatternKey[]>([]);
  const [driftPatternCustomText, setDriftPatternCustomText] = useState('');
  const [practiceStyleKey, setPracticeStyleKey] = useState<PracticeStyleKey | null>(null);
  const [personalTextureText, setPersonalTextureText] = useState('');
  const [tonePreferences, setTonePreferences] = useState<PersonalTextureTonePreference[]>([]);

  const howThisShowsUpOptions = useMemo(
    () => getHowThisShowsUpOptions(identityDirectionKey),
    [identityDirectionKey]
  );

  const goNext = useCallback(() => {
    setStepIndex((idx) => Math.min(idx + 1, ARC_CREATION_SURVEY_STEP_ORDER.length - 1));
  }, []);

  const toggleHowThisShowsUp = useCallback((key: string) => {
    setHowThisShowsUpKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      if (current.length >= 3) return current;
      return [...current, key];
    });
  }, []);

  const toggleDriftPattern = useCallback((key: DriftPatternKey) => {
    setDriftPatternKeys((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      if (current.length >= 2) return current;
      return [...current, key];
    });
  }, []);

  const toggleTonePreference = useCallback((key: PersonalTextureTonePreference) => {
    setTonePreferences((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }, []);

  const buildSurveyResponse = useCallback((): ArcSurveyV2Response | null => {
    const identityDirection = findOption(identityDirectionOptions, identityDirectionKey);
    const primaryArena = findOption(primaryArenaOptions, primaryArenaKey);
    const whyNow = findOption(whyNowOptions, whyNowKey);
    const practiceStyle = findOption(practiceStyleOptions, practiceStyleKey);
    if (!identityDirection || !primaryArena || !whyNow || !practiceStyle) return null;
    if (identityDirection.allowsCustomText && !identityDirectionCustomText.trim()) return null;
    if (primaryArena.allowsCustomText && !primaryArenaCustomText.trim()) return null;

    const howThisShowsUpSeeds = howThisShowsUpKeys
      .map((key) => howThisShowsUpOptions.find((option) => option.key === key) ?? null)
      .filter((option): option is HowThisShowsUpOption => Boolean(option));
    if (howThisShowsUpSeeds.length < 1 || howThisShowsUpSeeds.length > 3) return null;
    if (selectedCustomTextRequired(howThisShowsUpOptions, howThisShowsUpKeys) && !howThisShowsUpCustomText.trim()) {
      return null;
    }

    const driftPatterns = driftPatternKeys
      .map((key) => findOption(driftPatternOptions, key))
      .filter((option): option is ArcSurveyOption<DriftPatternKey> => Boolean(option));
    if (driftPatterns.length < 1 || driftPatterns.length > 2) return null;
    if (selectedCustomTextRequired(driftPatternOptions, driftPatternKeys) && !driftPatternCustomText.trim()) {
      return null;
    }

    const personalTexture =
      personalTextureText.trim().length > 0 || tonePreferences.length > 0
        ? {
            ...(personalTextureText.trim() ? { freeText: personalTextureText.trim() } : {}),
            ...(tonePreferences.length > 0 ? { tonePreferences } : {}),
          }
        : undefined;

    return {
      version: 2,
      identityDirection: {
        key: identityDirection.key,
        label: identityDirection.label,
        generationMeaning: identityDirection.generationMeaning,
        ...(identityDirection.allowsCustomText ? { customText: identityDirectionCustomText.trim() } : {}),
      },
      primaryArena: {
        key: primaryArena.key,
        label: primaryArena.label,
        ...(primaryArena.allowsCustomText ? { customText: primaryArenaCustomText.trim() } : {}),
      },
      whyNow: {
        key: whyNow.key,
        label: whyNow.label,
        generationMeaning: whyNow.generationMeaning,
      },
      howThisShowsUpSeeds: howThisShowsUpSeeds.map((option) => ({
        key: option.key,
        label: option.label,
        generationMeaning: option.generationMeaning,
        ...(option.allowsCustomText ? { customText: howThisShowsUpCustomText.trim() } : {}),
      })),
      driftPatterns: driftPatterns.map((option) => ({
        key: option.key,
        label: option.label,
        generationMeaning: option.generationMeaning,
        ...(option.allowsCustomText ? { customText: driftPatternCustomText.trim() } : {}),
      })),
      practiceStyle: {
        key: practiceStyle.key,
        label: practiceStyle.label,
        generationMeaning: practiceStyle.generationMeaning,
      },
      ...(personalTexture ? { personalTexture } : {}),
    };
  }, [
    driftPatternCustomText,
    driftPatternKeys,
    howThisShowsUpCustomText,
    howThisShowsUpKeys,
    howThisShowsUpOptions,
    identityDirectionCustomText,
    identityDirectionKey,
    personalTextureText,
    practiceStyleKey,
    primaryArenaCustomText,
    primaryArenaKey,
    tonePreferences,
    whyNowKey,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!workflowRuntime || !isArcCreationWorkflow) return;
    const surveyResponse = buildSurveyResponse();
    if (!surveyResponse) return;

    setSubmitting(true);
    // Let the final CTA visibly switch to its loading state before this card
    // unmounts as the workflow advances to the agent-generation step.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const generationInput = buildArcGenerationInputFromSurveyV2(surveyResponse);
    workflowRuntime.completeStep('context_collect', {
      prompt: generationInput.prompt,
      arcSurveyResponse: surveyResponse,
      arcSurveyAdditionalContext: generationInput.additionalContext,
      whyNow: surveyResponse.whyNow.label,
      domain: surveyResponse.primaryArena.customText || surveyResponse.primaryArena.label,
      proudMoment: surveyResponse.howThisShowsUpSeeds.map((item) => item.customText || item.label).join(', '),
      motivation: surveyResponse.practiceStyle.label,
      driftPatterns: surveyResponse.driftPatterns.map((item) => item.customText || item.label),
    });

    try {
      await workflowRuntime.invokeAgentStep?.({ stepId: 'agent_generate_arc' });
    } finally {
      setSubmitting(false);
    }
  }, [buildSurveyResponse, isArcCreationWorkflow, workflowRuntime]);

  const renderCustomInput = (
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string
  ) => (
    <Input
      value={value}
      onChangeText={onChangeText}
      multiline
      multilineMinHeight={82}
      multilineMaxHeight={120}
      placeholder={placeholder}
      autoCapitalize="sentences"
      returnKeyType="done"
      blurOnSubmit
      onSubmitEditing={() => Keyboard.dismiss()}
      style={styles.customInput}
    />
  );

  const renderSingleSelect = <TKey extends string>(
    options: Array<ArcSurveyOption<TKey>>,
    selectedKey: TKey | null,
    onSelect: (key: TKey) => void,
    onAfterSelect?: (option: ArcSurveyOption<TKey>) => void
  ) => (
    <View style={styles.fullWidthList}>
      {options.map((option) => {
        const selected = selectedKey === option.key;
        return (
          <Pressable
            key={option.key}
            style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              void HapticsService.trigger('canvas.selection');
              onSelect(option.key);
              onAfterSelect?.(option);
              if (!option.allowsCustomText) goNext();
            }}
          >
            <View style={styles.fullWidthOptionContent}>
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={[styles.fullWidthOptionLabel, selected && styles.fullWidthOptionLabelSelected]}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderChipSelect = <TKey extends string>(
    options: Array<ArcSurveyOption<TKey>>,
    selectedKey: TKey | null,
    onSelect: (key: TKey) => void
  ) => (
    <View style={styles.optionChipGrid}>
      {options.map((option) => {
        const selected = selectedKey === option.key;
        return (
          <Pressable
            key={option.key}
            style={[styles.optionChip, selected && styles.optionChipSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              void HapticsService.trigger('canvas.selection');
              onSelect(option.key);
              if (!option.allowsCustomText) goNext();
            }}
          >
            <Text style={[styles.optionChipLabel, selected && styles.optionChipLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderMultiSelect = <TKey extends string>(
    options: Array<ArcSurveyOption<TKey>>,
    selectedKeys: string[],
    maxSelections: number,
    onToggle: (key: TKey) => void
  ) => (
    <View style={styles.fullWidthList}>
      {options.map((option) => {
        const selected = selectedKeys.includes(option.key);
        const atMax = !selected && selectedKeys.length >= maxSelections;
        return (
          <Pressable
            key={option.key}
            style={[styles.fullWidthOption, selected && styles.fullWidthOptionSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              void HapticsService.trigger('canvas.selection');
              onToggle(option.key);
            }}
          >
            <View style={styles.fullWidthOptionContent}>
              <View style={[styles.checkboxOuter, selected && styles.checkboxOuterSelected]}>
                {selected ? <Icon name="check" size={14} color={colors.canvas} /> : null}
              </View>
              <Text style={[styles.fullWidthOptionLabel, selected && styles.fullWidthOptionLabelSelected]}>
                {option.label}
              </Text>
              {atMax ? <Text style={styles.maxLabel}>Max {maxSelections}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const renderMultiChipSelect = <TKey extends string>(
    options: Array<ArcSurveyOption<TKey>>,
    selectedKeys: string[],
    maxSelections: number,
    onToggle: (key: TKey) => void
  ) => (
    <View style={styles.optionChipGrid}>
      {options.map((option) => {
        const selected = selectedKeys.includes(option.key);
        return (
          <Pressable
            key={option.key}
            style={[styles.optionChip, selected && styles.optionChipSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => {
              void HapticsService.trigger('canvas.selection');
              onToggle(option.key);
            }}
          >
            <Text style={[styles.optionChipLabel, selected && styles.optionChipLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const steps = useMemo<SurveyStep[]>(() => {
    const selectedIdentityDirection = findOption(identityDirectionOptions, identityDirectionKey);
    const selectedPrimaryArena = findOption(primaryArenaOptions, primaryArenaKey);
    const selectedHowCustom = howThisShowsUpKeys.includes('custom');
    const selectedDriftCustom = driftPatternKeys.includes('custom');

    return [
      {
        id: 'identityDirection',
        title: ARC_CREATION_SURVEY_COPY.identityDirectionTitle,
        canProceed:
          Boolean(identityDirectionKey) &&
          (!selectedIdentityDirection?.allowsCustomText || identityDirectionCustomText.trim().length > 0),
        render: () => (
          <>
            {renderSingleSelect(
              identityDirectionOptions,
              identityDirectionKey,
              setIdentityDirectionKey,
              () => {
                setHowThisShowsUpKeys([]);
                setHowThisShowsUpCustomText('');
              }
            )}
            {selectedIdentityDirection?.allowsCustomText
              ? renderCustomInput(
                  identityDirectionCustomText,
                  setIdentityDirectionCustomText,
                  ARC_CREATION_SURVEY_COPY.identityDirectionCustomPlaceholder
                )
              : null}
          </>
        ),
      },
      {
        id: 'primaryArena',
        title: ARC_CREATION_SURVEY_COPY.primaryArenaTitle,
        canProceed:
          Boolean(primaryArenaKey) &&
          (!selectedPrimaryArena?.allowsCustomText || primaryArenaCustomText.trim().length > 0),
        render: () => (
          <>
            {renderChipSelect(primaryArenaOptions, primaryArenaKey, setPrimaryArenaKey)}
            {selectedPrimaryArena?.allowsCustomText
              ? renderCustomInput(
                  primaryArenaCustomText,
                  setPrimaryArenaCustomText,
                  ARC_CREATION_SURVEY_COPY.primaryArenaCustomPlaceholder
                )
              : null}
          </>
        ),
      },
      {
        id: 'whyNow',
        title: ARC_CREATION_SURVEY_COPY.whyNowTitle,
        canProceed: Boolean(whyNowKey),
        render: () => renderSingleSelect(whyNowOptions, whyNowKey, setWhyNowKey),
      },
      {
        id: 'howThisShowsUpSeeds',
        title: ARC_CREATION_SURVEY_COPY.howThisShowsUpSeedsTitle,
        canProceed:
          howThisShowsUpKeys.length >= 1 &&
          howThisShowsUpKeys.length <= 3 &&
          (!selectedHowCustom || howThisShowsUpCustomText.trim().length > 0),
        render: () => (
          <>
            <Text style={styles.selectHint}>Pick up to 3</Text>
            {renderMultiSelect(howThisShowsUpOptions, howThisShowsUpKeys, 3, toggleHowThisShowsUp)}
            {selectedHowCustom
              ? renderCustomInput(
                  howThisShowsUpCustomText,
                  setHowThisShowsUpCustomText,
                  ARC_CREATION_SURVEY_COPY.howThisShowsUpSeedsCustomPlaceholder
                )
              : null}
          </>
        ),
      },
      {
        id: 'driftPatterns',
        title: ARC_CREATION_SURVEY_COPY.driftPatternsTitle,
        canProceed:
          driftPatternKeys.length >= 1 &&
          driftPatternKeys.length <= 2 &&
          (!selectedDriftCustom || driftPatternCustomText.trim().length > 0),
        render: () => (
          <>
            <Text style={styles.selectHint}>Pick up to 2</Text>
            {renderMultiChipSelect(driftPatternOptions, driftPatternKeys, 2, toggleDriftPattern)}
            {selectedDriftCustom
              ? renderCustomInput(
                  driftPatternCustomText,
                  setDriftPatternCustomText,
                  ARC_CREATION_SURVEY_COPY.driftPatternsCustomPlaceholder
                )
              : null}
          </>
        ),
      },
      {
        id: 'practiceStyle',
        title: ARC_CREATION_SURVEY_COPY.practiceStyleTitle,
        canProceed: Boolean(practiceStyleKey),
        render: () => renderSingleSelect(practiceStyleOptions, practiceStyleKey, setPracticeStyleKey),
      },
      {
        id: 'personalTexture',
        title: ARC_CREATION_SURVEY_COPY.personalTextureTitle,
        canProceed: !submitting,
        render: () => (
          <>
            <Text style={styles.helperText}>{ARC_CREATION_SURVEY_COPY.personalTextureHelper}</Text>
            {renderCustomInput(
              personalTextureText,
              setPersonalTextureText,
              ARC_CREATION_SURVEY_COPY.personalTexturePlaceholder
            )}
            <View style={styles.chipWrap}>
              {personalTextureToneOptions.map((option) => {
                const selected = tonePreferences.includes(option.key);
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.textureChip, selected && styles.textureChipSelected]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      void HapticsService.trigger('canvas.selection');
                      toggleTonePreference(option.key);
                    }}
                  >
                    <Text style={[styles.textureChipLabel, selected && styles.fullWidthOptionLabelSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ),
      },
    ];
  }, [
    driftPatternCustomText,
    driftPatternKeys,
    howThisShowsUpCustomText,
    howThisShowsUpKeys,
    howThisShowsUpOptions,
    identityDirectionCustomText,
    identityDirectionKey,
    personalTextureText,
    practiceStyleKey,
    primaryArenaCustomText,
    primaryArenaKey,
    submitting,
    toggleDriftPattern,
    toggleHowThisShowsUp,
    toggleTonePreference,
    tonePreferences,
    whyNowKey,
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
      variant="panel"
      steps={steps}
      currentStepIndex={stepIndex}
      stepLabel={stepLabel}
      nextLabel="Continue"
      submitLabel={submitting ? 'Thinking…' : 'Create Arc'}
      footerRight={
        <HStack alignItems="center" justifyContent="flex-end" space="sm">
          {!isFirst ? (
            <Button
              variant="ghost"
              onPress={() => {
                setStepIndex((idx) => Math.max(0, idx - 1));
              }}
              accessibilityLabel="Back"
            >
              <ButtonLabel size="md">Back</ButtonLabel>
            </Button>
          ) : null}
          <Button
            variant="primary"
            disabled={isPrimaryDisabled}
            style={isPrimaryDisabled ? styles.primaryDisabled : undefined}
            onPress={
              isLast
                ? () => {
                    if (submitting) return;
                    void handleSubmit();
                  }
                : goNext
            }
            accessibilityLabel={isLast ? 'Create Arc' : 'Continue'}
          >
            <ButtonLabel size="md" tone={isPrimaryDisabled ? 'muted' : 'inverse'}>
              {isLast ? (submitting ? 'Thinking…' : 'Create Arc') : 'Continue'}
            </ButtonLabel>
          </Button>
        </HStack>
      }
      onBack={() => {
        setStepIndex((idx) => Math.max(0, idx - 1));
      }}
      onNext={goNext}
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
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  selectHint: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  customInput: {
    marginTop: spacing.md,
  },
  fullWidthList: {
    gap: spacing.sm,
  },
  optionChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  optionChip: {
    width: '48.5%',
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipSelected: {
    borderColor: colors.turmeric,
    backgroundColor: 'rgba(226, 156, 69, 0.12)',
  },
  optionChipLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '600',
  },
  optionChipLabelSelected: {
    color: colors.textPrimary,
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
  maxLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  textureChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textureChipSelected: {
    borderColor: colors.turmeric,
  },
  textureChipLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
});
