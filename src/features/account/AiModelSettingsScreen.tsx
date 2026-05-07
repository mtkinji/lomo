import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Icon } from '../../ui/Icon';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HStack, Text, VStack, Textarea, Button, KeyboardAwareScrollView } from '../../ui/primitives';
import { buildUserProfileSummary } from '../../services/ai';

type AiModelSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsAiModel'
>;

const IDENTITY_PROMPT_TEMPLATE =
  "You are helping me write a short bio for a life architecture app I use to organize my life and work. " +
  "In 4–6 sentences, summarize who I am, the roles I carry, what matters most to me right now, and any constraints or boundaries I’m living within. " +
  "Write it in the first person so I can paste it directly into the app.";

export function AiModelSettingsScreen() {
  const navigation = useNavigation<AiModelSettingsNavigationProp>();
  const identitySummary = useAppStore(
    (state) => state.userProfile?.identitySummary ?? '',
  );
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const [identityDraft, setIdentityDraft] = useState(identitySummary);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);

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
    commitIdentitySummary();
    navigation.goBack();
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader title="Agent" onPressBack={handleNavigateBack} />
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        >
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
  sectionBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  contextTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
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
