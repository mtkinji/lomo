import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { spacing, typography, colors } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'My laptop has been slow since yesterday.' },
  {
    id: 'm2',
    role: 'assistant',
    content:
      "Let's troubleshoot like tech ninjas. 🥷 Any recent installs or updates? Chrome extensions are usual suspects. Let's try:\n1. Disable unnecessary extensions\n2. Clear browser cache\n3. Restart your laptop\nAlso, how's your disk space looking?",
  },
  {
    id: 'm3',
    role: 'user',
    content: 'Pretty full. Like, 12GB left on a 256GB SSD.',
  },
  {
    id: 'm4',
    role: 'assistant',
    content:
      "Yep, your laptop's gasping for space. Try cleaning up large files or offloading to the cloud. Need a script to clean temp files?",
  },
];

const PROMPT_SUGGESTIONS = [
  'Best way to learn a new language',
  'Find a great Japanese architect',
  'Optimize onboarding flow',
];

const CHAT_COLORS = {
  background: colors.shell,
  surface: colors.canvas,
  assistantBubble: colors.card,
  userBubble: colors.shellAlt,
  accent: colors.accent,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  border: colors.border,
  chipBorder: colors.border,
  chip: colors.card,
};

export function AiChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const hasInput = input.trim().length > 0;
  const canSend = hasInput && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = input.trim();
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed },
      {
        id: `assistant-${Date.now() + 1}`,
        role: 'assistant',
        content: "Give me a beat—drafting guidance. I'll keep replies grounded and actionable.",
      },
    ]);
    setInput('');
    setSending(false);
  };

  const scrollToLatest = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToLatest();
  }, [messages.length]);

  return (
    <AppShell>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.xl : 0}
      >
        <View style={styles.body}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToLatest}
          >
            <View style={styles.timeline}>
              <View style={styles.headerRow}>
                <Text style={styles.modelLabel}>ChatGPT 5.1</Text>
                <View style={styles.modePill}>
                  <Text style={styles.modePillText}>Test</Text>
                </View>
              </View>
              <Text style={styles.presenceText}>
                Here with you. What do you want to dig into next? 😊
              </Text>
              <View style={styles.suggestionRow}>
                {PROMPT_SUGGESTIONS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="ghost"
                    style={styles.suggestionChip}
                    onPress={() => setInput(prompt)}
                  >
                    <Text style={styles.suggestionText}>{prompt}</Text>
                  </Button>
                ))}
              </View>

              <View style={styles.messagesStack}>
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
                    ]}
                  >
                    <Text style={styles.messageMeta}>
                      {message.role === 'assistant' ? 'ChatGPT' : 'You'}
                    </Text>
                    <Text style={styles.messageText}>{message.content}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.composerFence}>
            <View style={styles.composerSection}>
              <View style={styles.composerRow}>
                <Button
                  variant="ghost"
                  size="icon"
                  style={styles.attachButton}
                  onPress={() => {}}
                  accessibilityLabel="Add context"
                >
                  <Icon name="plus" color={CHAT_COLORS.textSecondary} size={18} />
                </Button>
                <View style={styles.inputShell}>
                  <View style={styles.inputField}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ask anything"
                      placeholderTextColor={CHAT_COLORS.textSecondary}
                      value={input}
                      onChangeText={setInput}
                      multiline
                    />
                  </View>
                  {hasInput ? (
                    <Button
                      variant="default"
                      size="icon"
                      style={[styles.sendButton, sending && styles.sendingButton]}
                      onPress={handleSend}
                      disabled={!canSend}
                      accessibilityLabel="Send message"
                    >
                      {sending ? (
                        <ActivityIndicator color={colors.canvas} />
                      ) : (
                        <Icon name="arrowUp" color={colors.canvas} size={18} />
                      )}
                    </Button>
                  ) : (
                    <TouchableOpacity
                      style={styles.trailingIcon}
                      onPress={() => {}}
                      accessibilityLabel="Record audio prompt"
                    >
                      <Icon name="mic" color={CHAT_COLORS.textSecondary} size={18} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  composerFence: {
    marginTop: 'auto',
  },
  timeline: {
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelLabel: {
    ...typography.titleLg,
    color: CHAT_COLORS.textPrimary,
  },
  modePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: CHAT_COLORS.surface,
  },
  modePillText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  presenceText: {
    ...typography.body,
    color: CHAT_COLORS.textSecondary,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHAT_COLORS.chipBorder,
    backgroundColor: CHAT_COLORS.chip,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 0,
  },
  suggestionText: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
  },
  messagesStack: {
    gap: spacing.md,
  },
  messageBubble: {
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: CHAT_COLORS.assistantBubble,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: CHAT_COLORS.assistantBubble,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: CHAT_COLORS.userBubble,
  },
  messageMeta: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  messageText: {
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
  },
  composerSection: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: CHAT_COLORS.border,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inputShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: CHAT_COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
  },
  attachButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    backgroundColor: CHAT_COLORS.surface,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
    lineHeight: typography.body.lineHeight,
    minHeight: typography.body.lineHeight,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  trailingIcon: {
    paddingHorizontal: spacing.sm,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: CHAT_COLORS.accent,
    borderColor: CHAT_COLORS.accent,
  },
  sendingButton: {
    opacity: 0.7,
  },
  disclaimer: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
    textAlign: 'center',
  },
});

