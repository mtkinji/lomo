import { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon } from '../../ui/Icon';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore, type LlmModel } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HStack, Text, VStack } from '../../ui/primitives';

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

const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'gpt-4o-mini',
    label: 'GPT‑4o mini',
    description: 'Fast, light coach that’s great for quick questions and day-to-day guidance.',
    latencyHint: 'Best for speed and battery on mobile.',
  },
  {
    value: 'gpt-4o',
    label: 'GPT‑4o',
    description:
      'Heavier coach with stronger reasoning for complex arcs, tradeoffs, and deeper planning.',
    latencyHint: 'May respond a bit slower but can handle more nuance.',
  },
];

export function AiModelSettingsScreen() {
  const navigation = useNavigation<AiModelSettingsNavigationProp>();
  const llmModel = useAppStore((state) => state.llmModel);
  const setLlmModel = useAppStore((state) => state.setLlmModel);

  const currentLabel = useMemo(() => {
    const active = MODEL_OPTIONS.find((option) => option.value === llmModel);
    return active?.label ?? 'GPT‑4o mini';
  }, [llmModel]);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Models"
          onPressBack={() => navigation.goBack()}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionBody}>
              Choose which OpenAI model powers the Takado Agent. This changes how the agent
              balances speed, depth, and nuance across arcs, goals, and chat.
            </Text>
            <Text style={styles.sectionSummary}>
              <Text style={styles.sectionSummaryStrong}>Currently using: </Text>
              {currentLabel}
            </Text>
          </View>

          <VStack space="md">
            {MODEL_OPTIONS.map((option) => {
              const isSelected = option.value === llmModel;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setLlmModel(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
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

          <View style={styles.footerCallout}>
            <Text style={styles.footerTitle}>How this setting works</Text>
            <Text style={styles.footerBody}>
              The Takado Agent always talks to OpenAI on your behalf using your app’s API key.
              Switching models only changes which OpenAI model we call; it doesn’t change what
              data we store locally in LOMO.
            </Text>
          </View>
        </ScrollView>
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
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
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
  optionCard: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
});

