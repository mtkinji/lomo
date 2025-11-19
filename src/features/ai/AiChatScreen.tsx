import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { spacing, typography, colors, fonts } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { CoachChatTurn, sendCoachChat } from '../../services/ai';
import { CHAT_MODE_REGISTRY, type ChatMode } from './chatRegistry';

type ChatMessageRole = 'assistant' | 'user' | 'system';

type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
};

// Default visual state: the user has not said anything yet, but the coach can
// open with guidance. This lets us show initial instructions while still
// treating the canvas as "no user messages yet" for UI behaviors.
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'coach-intro-1',
    role: 'assistant',
    content:
      "I'm your Lomo coach for this season. I can help you clarify goals, design arcs, and plan today's focus. What's the most important thing you want to move forward right now?",
  },
];

const PROMPT_SUGGESTIONS = [
  'Best way to learn a new language',
  'Find a great Japanese architect',
  'Optimize onboarding flow',
];

const CHAT_COLORS = {
  // When rendered inside the BottomDrawer or LomoBottomSheet, the sheet surface
  // already uses `colors.canvas` and horizontal gutters. This palette assumes
  // that outer shell and keeps inner elements focused on content hierarchy.
  background: colors.canvas,
  surface: colors.canvas,
  assistantBubble: colors.card,
  userBubble: colors.shellAlt,
  accent: colors.accent,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  border: colors.border,
  chipBorder: colors.border,
  chip: colors.card,
} as const;

export type AiChatPaneProps = {
  /**
   * Optional high-level mode describing what job the coach is doing.
   * For example, ArcsScreen passes "arcCreation" when launching from the
   * new Arc flow so the coach can lean into that context.
   */
  mode?: ChatMode;
  /**
   * Optional launch context summarizing the workspace (arcs, goals, etc.).
   * When provided, this is injected as a hidden "system" message so that
   * every turn of the conversation has access to it without cluttering the UI.
   */
  launchContext?: string;
};

/**
 * Core chat pane to be rendered inside the LOMO bottom sheet.
 * This component intentionally does NOT own global app padding or navigation
 * chrome – the sheet + AppShell handle those layers.
 */
export function AiChatPane({ mode, launchContext }: AiChatPaneProps) {
  const buildInitialMessages = (): ChatMessage[] => {
    const modeConfig = mode ? CHAT_MODE_REGISTRY[mode] : undefined;
    const modeSystemPrompt = modeConfig?.systemPrompt;
    const isArcCreationMode = mode === 'arcCreation';

    if (!launchContext && !modeSystemPrompt && !isArcCreationMode) {
      return INITIAL_MESSAGES;
    }

    const blocks: string[] = [];

    if (modeSystemPrompt) {
      blocks.push(modeSystemPrompt.trim());
    }

    if (launchContext) {
      blocks.push(
        '---',
        'Workspace snapshot: existing arcs and goals. Use this to avoid duplicating identity directions and to keep new Arc suggestions complementary to what already exists.',
        launchContext.trim()
      );
    }

    const contextContent = blocks.join('\n\n');

    const systemMessage: ChatMessage = {
      id: 'system-launch-context',
      role: 'system',
      content: contextContent,
    };

    // For arcCreation, we let the model generate the very first visible
    // assistant message using the mode-specific system prompt + workspace
    // snapshot instead of showing the generic placeholder intro.
    if (isArcCreationMode) {
      return [systemMessage];
    }

    return [systemMessage, ...INITIAL_MESSAGES];
  };

  const initialMessages = buildInitialMessages();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const inputRef = useRef<TextInput | null>(null);

  const hasInput = input.trim().length > 0;
  const canSend = hasInput && !sending;
  const hasUserMessages = messages.some((m) => m.role === 'user');

  const handleStartDictation = () => {
    // Today we lean on the system keyboard’s built-in dictation controls.
    // Focusing the input reliably shows the keyboard; users can tap the mic
    // there, which uses Apple’s on-device transcription.
    inputRef.current?.focus();
  };

  const streamAssistantReply = (
    fullText: string,
    baseId: string,
    opts?: { onDone?: () => void }
  ) => {
    const messageId = `${baseId}-${Date.now()}`;

    // Seed an empty assistant message so the user sees something appear
    // immediately, then gradually reveal the full content.
    setMessages((prev) => {
      const next: ChatMessage[] = [
        ...prev,
        {
          id: messageId,
          role: 'assistant',
          content: '',
        },
      ];
      messagesRef.current = next;
      return next;
    });

    const totalLength = fullText.length;
    if (totalLength === 0) {
      opts?.onDone?.();
      return;
    }

    let index = 0;
    const step = () => {
      index = Math.min(index + 3, totalLength);
      const nextContent = fullText.slice(0, index);

      setMessages((prev) => {
        const next = prev.map((message) =>
          message.id === messageId ? { ...message, content: nextContent } : message
        );
        messagesRef.current = next;
        return next;
      });

      if (index < totalLength) {
        setTimeout(step, 20);
      } else {
        opts?.onDone?.();
      }
    };

    // Kick off the first animation frame.
    setTimeout(step, 20);
  };

  // For arcCreation mode, automatically ask the model for an initial
  // assistant message on mount so the conversation opens with guidance
  // that respects the Arc Creation Agent system prompt (including age
  // awareness) instead of a static placeholder.
  useEffect(() => {
    if (mode !== 'arcCreation' || bootstrapped) {
      return;
    }

    let cancelled = false;

    const bootstrapConversation = async () => {
      try {
        const history: CoachChatTurn[] = messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const reply = await sendCoachChat(history);
        if (cancelled) return;
        streamAssistantReply(reply, 'assistant-bootstrap', {
          onDone: () => {
            if (!cancelled) {
              setBootstrapped(true);
            }
          },
        });
      } catch (err) {
        console.error('Lomo Coach initial chat failed', err);
      } finally {
        if (!cancelled) {
          // In error cases we still mark as bootstrapped so we don’t loop.
          setBootstrapped(true);
        }
      }
    };

    bootstrapConversation();

    return () => {
      cancelled = true;
    };
  }, [mode, bootstrapped]);

  const handleSend = async () => {
    if (!canSend) return;
    const trimmed = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setSending(true);
    setMessages((prev) => {
      const next = [...prev, userMessage];
      messagesRef.current = next;
      return next;
    });
    setInput('');

    try {
      const history: CoachChatTurn[] = messagesRef.current.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await sendCoachChat(history);
      streamAssistantReply(reply, 'assistant', {
        onDone: () => {
          setSending(false);
        },
      });
    } catch (err) {
      console.error('Lomo Coach chat failed', err);
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now() + 2}`,
        role: 'assistant',
        content:
          "I'm having trouble reaching Lomo Coach right now. Try again in a moment, or adjust your connection.",
      };
      setMessages((prev) => {
        const next = [...prev, errorMessage];
        messagesRef.current = next;
        return next;
      });
    } finally {
      // If the happy-path streaming already cleared `sending`, don’t
      // override it here; this mainly protects the error path.
      setSending((current) => (current ? false : current));
    }
  };

  const scrollToLatest = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToLatest();
  }, [messages.length]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  return (
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
            <View style={styles.brandHeaderRow}>
              <View style={styles.brandLockup}>
                <Logo size={24} />
                <View style={styles.brandTextBlock}>
                  <Text style={styles.brandWordmark}>Lomo Coach</Text>
                </View>
              </View>
            </View>

            <View style={styles.messagesStack}>
              {messages
                .filter((message) => message.role !== 'system')
                .map((message) =>
                  message.role === 'assistant' ? (
                    <View key={message.id} style={styles.assistantMessage}>
                      <Text style={styles.assistantText}>{message.content}</Text>
                    </View>
                  ) : (
                    <View key={message.id} style={[styles.messageBubble, styles.userBubble]}>
                      <Text style={styles.userMeta}>You</Text>
                      <Text style={styles.userText}>{message.content}</Text>
                    </View>
                  ),
                )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.composerFence}>
          {!hasUserMessages && (
            <View style={styles.suggestionsFence}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionRow}
              >
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
              </ScrollView>
            </View>
          )}
          <View style={styles.composerSection}>
            <View style={styles.composerRow}>
              <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
                <View style={styles.inputShell}>
                  <View style={styles.inputField}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      placeholder="Ask anything"
                      placeholderTextColor={CHAT_COLORS.textSecondary}
                      value={input}
                      onChangeText={setInput}
                      multiline
                      scrollEnabled={false}
                      textAlignVertical="top"
                    />
                  </View>
                  <View style={styles.inputFooterRow}>
                    {hasInput ? (
                      <Button
                        variant="default"
                        size="icon"
                        style={[
                          styles.sendButton,
                          (sending || !canSend) && styles.sendButtonInactive,
                        ]}
                        onPress={handleSend}
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
                        style={styles.voiceButton}
                        onPress={handleStartDictation}
                        accessibilityLabel="Start voice input"
                        activeOpacity={0.85}
                      >
                        <Icon name="mic" color={colors.canvas} size={18} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Convenience wrapper when the chat is used as a full-screen screen instead of
 * inside a bottom sheet. This preserves the existing AppShell-based layout
 * while letting BottomDrawer / LomoBottomSheet embed `AiChatPane` directly.
 */
export function AiChatScreen() {
  // Lazy-load AppShell here to avoid coupling the pane itself to app chrome.
  const { AppShell } = require('../../ui/layout/AppShell') as typeof import('../../ui/layout/AppShell');
  return (
    <AppShell>
      <AiChatPane />
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
  brandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTextBlock: {
    flexDirection: 'column',
  },
  brandWordmark: {
    ...typography.titleSm,
    fontFamily: fonts.logo,
    color: CHAT_COLORS.textPrimary,
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
    color: CHAT_COLORS.textPrimary,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionChip: {
    // ShadCN secondary-style prompt chip: soft gray surface, no border,
    // rectangular with gentle corner radius.
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
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
    // Add extra breathing room between the brand lockup at the top of the
    // sheet and the first coach response so the conversation feels more
    // like a distinct thread starting below the header.
    marginTop: spacing['2xl'],
  },
  assistantMessage: {
    // Align assistant replies like a chat bubble on the left and prevent
    // them from stretching full-width so they read more like a message
    // thread instead of a full-width document.
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  assistantMeta: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  assistantText: {
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    maxWidth: '82%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: CHAT_COLORS.userBubble,
  },
  userMeta: {
    ...typography.bodySm,
    color: CHAT_COLORS.textSecondary,
  },
  userText: {
    ...typography.body,
    color: CHAT_COLORS.textPrimary,
  },
  suggestionsFence: {
    paddingBottom: spacing.sm,
  },
  composerSection: {
    gap: spacing.sm,
    // Let the input pill "float" against the bottom of the chat area without a
    // hard divider line, similar to Cursor's chat. We keep a small margin so it
    // doesn't collide with the suggested prompts rail.
    marginTop: spacing.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  inputShell: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
    // ShadCN textarea–like: rectangular surface with gentle radius.
    backgroundColor: CHAT_COLORS.surface,
    borderRadius: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    // Ensure the composer feels like a tall, roomy textarea even before the
    // user starts typing.
    minHeight: spacing['2xl'] * 2, // 64 * 2 = 128
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
  },
  inputField: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  input: {
    flex: 1,
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
    lineHeight: typography.bodySm.lineHeight,
    minHeight: typography.bodySm.lineHeight * 6,
    maxHeight: typography.bodySm.lineHeight * 12,
    paddingTop: 0,
    paddingBottom: spacing.xs,
    textAlignVertical: 'top',
  },
  inputFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  trailingIcon: {
    paddingHorizontal: spacing.sm,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#18181B',
    borderColor: '#18181B',
    width: 36,
    height: 36,
  },
  voiceButton: {
    backgroundColor: '#18181B',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonInactive: {
    opacity: 0.4,
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

