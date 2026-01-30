import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View, Pressable, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon } from '../../ui/Icon';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore, type LlmModel } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HStack, Text, VStack, Textarea, Button, KeyboardAwareScrollView } from '../../ui/primitives';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { buildUserProfileSummary } from '../../services/ai';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';

type AiModelSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsAiModel'
>;

type ModelOption = {
  value: LlmModel;
  label: string;
  description: string;
  latencyHint: string;
};

const IDENTITY_PROMPT_TEMPLATE =
  "You are helping me write a short bio for a life architecture app I use to organize my life and work. " +
  "In 4–6 sentences, summarize who I am, the roles I carry, what matters most to me right now, and any constraints or boundaries I’m living within. " +
  "Write it in the first person so I can paste it directly into the app.";

const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'gpt-4o-mini',
    label: 'GPT‑4o mini',
    description: 'Fast, light coach for quick questions.',
    latencyHint: 'Best for speed and battery.',
  },
  {
    value: 'gpt-4o',
    label: 'GPT‑4o',
    description:
      'Stronger reasoning for complex arcs and tradeoffs.',
    latencyHint: 'A bit slower, more nuanced.',
  },
  {
    value: 'gpt-5.2',
    label: 'GPT‑5.2',
    description:
      'Deepest reasoning for multi-step planning.',
    latencyHint: 'Slowest and most costly, but most capable.',
  },
];

export function AiModelSettingsScreen() {
  const navigation = useNavigation<AiModelSettingsNavigationProp>();
  const llmModel = useAppStore((state) => state.llmModel);
  const setLlmModel = useAppStore((state) => state.setLlmModel);
  const isPro = useEntitlementsStore((state) => state.isPro);
  const identitySummary = useAppStore(
    (state) => state.userProfile?.identitySummary ?? '',
  );
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const [activeTab, setActiveTab] = useState<'contexts' | 'models'>('contexts');
  const [identityDraft, setIdentityDraft] = useState(identitySummary);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);

  const currentLabel = useMemo(() => {
    const resolvedModel: LlmModel =
      !isPro && (llmModel === 'gpt-5.1' || llmModel === 'gpt-5.2')
        ? 'gpt-4o-mini'
        : llmModel === 'gpt-5.1'
          ? 'gpt-5.2'
          : llmModel;
    const active = MODEL_OPTIONS.find((option) => option.value === resolvedModel);
    return active?.label ?? 'GPT‑4o mini';
  }, [isPro, llmModel]);

  const inferredSummary = useMemo(() => {
    const summary = buildUserProfileSummary();
    if (summary && summary.trim().length > 0) {
      return summary.trim();
    }
    return 'We don’t have much to go on yet. As you add more context and use arcs and goals, the coach will keep this summary up to date.';
  }, [identitySummary]);

  const commitIdentitySummary = () => {
    const trimmed = identityDraft.trim();
    updateUserProfile((current) => ({
      ...current,
      identitySummary: trimmed.length > 0 ? trimmed : undefined,
    }));
  };

  const handleCopyIdentityPrompt = async () => {
    try {
      await Clipboard.setStringAsync(IDENTITY_PROMPT_TEMPLATE);
      setHasCopiedPrompt(true);
      setTimeout(() => {
        setHasCopiedPrompt(false);
      }, 2500);
    } catch (error) {
      // Fallback to showing the prompt if the clipboard fails for any reason.
      Alert.alert('Example prompt', IDENTITY_PROMPT_TEMPLATE);
    }
  };

  const handleNavigateBack = () => {
    if (activeTab === 'contexts') {
      commitIdentitySummary();
    }
    navigation.goBack();
  };

  const handleSwitchToContexts = () => {
    setActiveTab('contexts');
  };

  const handleSwitchToModels = () => {
    if (activeTab === 'contexts') {
      commitIdentitySummary();
    }
    setActiveTab('models');
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Agent"
          onPressBack={handleNavigateBack}
        />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        >
          <SegmentedControl
            style={styles.tabSwitcher}
            value={activeTab}
            onChange={(next) => {
              if (next === 'contexts') {
                handleSwitchToContexts();
              } else {
                handleSwitchToModels();
              }
            }}
            options={[
              { value: 'contexts', label: 'Contexts' },
              { value: 'models', label: 'Models' },
            ]}
          />

          {activeTab === 'contexts' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionBody}>
                  Tell the Agent about you. We combine these into a single private context
                  that travels with your arcs, goals, and chats.
                </Text>
              </View>

              <View style={styles.contextCard}>
                <VStack space="xs">
                  <Text style={styles.contextTitle}>
                    What do you want the app to know about you?
                  </Text>
                  <Textarea
                    placeholder="Share anything that will help the coach understand your context, constraints, or what matters most."
                    multiline
                    numberOfLines={4}
                    value={identityDraft}
                    onChangeText={setIdentityDraft}
                    onBlur={commitIdentitySummary}
                    variant="outline"
                  />
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.promptHelper}>
                      Tap the clipboard to copy an example prompt you can paste into your favorite AI.
                    </Text>
                    <Button
                      size="small"
                      variant="outline"
                      onPress={handleCopyIdentityPrompt}
                      accessibilityRole="button"
                      accessibilityLabel="Copy example prompt to clipboard"
                    >
                      <HStack alignItems="center" space="xs">
                        <Icon name="clipboard" size={18} color={colors.textPrimary} />
                        <Text style={styles.promptButtonLabel}>Copy Prompt</Text>
                      </HStack>
                    </Button>
                  </HStack>
                  {hasCopiedPrompt ? (
                    <Text style={styles.promptCopied}>
                      Prompt copied. Paste it into ChatGPT, Claude, or your favorite AI.
                    </Text>
                  ) : null}
                </VStack>
              </View>

              <View style={styles.contextCard}>
                <VStack space="xs">
                  <Text style={styles.contextTitle}>What the app is inferring</Text>
                  <Text style={styles.sectionBody}>{inferredSummary}</Text>
                </VStack>
              </View>
            </>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionBody}>
                  Choose which OpenAI model powers your Agent.
                </Text>
              </View>

              <VStack space="md">
                {MODEL_OPTIONS.map((option) => {
                  const resolvedModel: LlmModel =
                    !isPro && (llmModel === 'gpt-5.1' || llmModel === 'gpt-5.2')
                      ? 'gpt-4o-mini'
                      : llmModel === 'gpt-5.1'
                        ? 'gpt-5.2'
                        : llmModel;
                  const isSelected = option.value === resolvedModel;
                  const isLocked = option.value === 'gpt-5.2' && !isPro;
                  return (
                    <Pressable
                      key={option.value}
                      disabled={isLocked}
                      onPress={() => {
                        if (isLocked) {
                          Alert.alert('Kwilt Pro required', 'GPT‑5.2 is available for Pro tier users.');
                          return;
                        }
                        setLlmModel(option.value);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected, disabled: isLocked }}
                    >
                      <View
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                          isLocked && styles.optionCardDisabled,
                        ]}
                      >
                        <HStack justifyContent="space-between" alignItems="center" space="md">
                          <VStack space="xs" flex={1}>
                            <Text style={styles.optionLabel}>{option.label}</Text>
                            <Text style={styles.optionDescription}>{option.description}</Text>
                            <Text style={styles.optionLatency}>{option.latencyHint}</Text>
                          </VStack>
                          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected ? (
                              <Icon name="check" size={12} color={colors.canvas} />
                            ) : null}
                          </View>
                        </HStack>
                      </View>
                    </Pressable>
                  );
                })}
              </VStack>
            </>
          )}
          </KeyboardAwareScrollView>
        </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  sectionBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sectionSummary: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sectionSummaryStrong: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  contextTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  optionCard: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardDisabled: {
    opacity: 0.45,
  },
  optionCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.shellAlt,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  optionDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  optionLatency: {
    ...typography.bodySm,
    color: colors.muted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  footerCallout: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  footerTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  footerBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tabSwitcher: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  contextCard: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  contextInput: {
    ...typography.bodySm,
    color: colors.textPrimary,
    minHeight: 120,
  },
  promptHelper: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    flex: 1,
  },
  promptButtonLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  promptCopied: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.xs / 2,
  },
});

