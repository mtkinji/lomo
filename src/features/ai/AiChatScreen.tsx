import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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

const INPUT_MIN_HEIGHT = typography.bodySm.lineHeight * 3;
const INPUT_MAX_HEIGHT = typography.bodySm.lineHeight * 8;

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
  const isArcCreationMode = mode === 'arcCreation';

  const buildInitialMessages = (): ChatMessage[] => {
    const modeConfig = mode ? CHAT_MODE_REGISTRY[mode] : undefined;
    const modeSystemPrompt = modeConfig?.systemPrompt;

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
  const [thinking, setThinking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
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
        setThinking(true);
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
              setThinking(false);
            }
          },
        });
      } catch (err) {
        console.error('Lomo Coach initial chat failed', err);
      } finally {
        if (!cancelled) {
          // In error cases we still mark as bootstrapped so we don’t loop.
          setBootstrapped(true);
          setThinking(false);
        }
      }
    };

    bootstrapConversation();

    return () => {
      cancelled = true;
    };
  }, [mode, bootstrapped]);

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    const trimmed = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setSending(true);
    setThinking(true);
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
          setThinking(false);
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
      setThinking(false);
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

  // Keep the composer and submit button fully visible by lifting them above
  // the software keyboard. Because the chat lives inside a custom bottom sheet
  // (with its own transforms), the standard KeyboardAvoidingView behavior
  // isn’t enough, so we adjust the bottom margin manually.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView style={styles.flex}>
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
              {isArcCreationMode && (
                <View style={styles.modePill}>
                  <Icon
                    name="arcs"
                    size={14}
                    color={CHAT_COLORS.textSecondary}
                    style={styles.modePillIcon}
                  />
                  <Text style={styles.modePillText}>Arc creation</Text>
                </View>
              )}
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
                      <Text style={styles.userText}>{message.content}</Text>
                    </View>
                  ),
                )}
              {thinking && (
                <View style={styles.assistantMessage}>
                  <ThinkingBubble />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.composerFence,
            keyboardHeight > 0 && { marginBottom: keyboardHeight - spacing.lg },
          ]}
        >
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
              <Pressable
                style={[
                  styles.inputShell,
                  keyboardHeight > 0 && styles.inputShellRaised,
                ]}
                onPress={() => inputRef.current?.focus()}
              >
                <View style={styles.inputField}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { height: inputHeight }]}
                    placeholder="Ask anything"
                    placeholderTextColor={CHAT_COLORS.textSecondary}
                    value={input}
                    onChangeText={setInput}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled={inputHeight >= INPUT_MAX_HEIGHT}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    onContentSizeChange={(event) => {
                      const nextHeight = event.nativeEvent.contentSize.height;
                      setInputHeight((current) => {
                        const clamped = Math.min(
                          INPUT_MAX_HEIGHT,
                          Math.max(INPUT_MIN_HEIGHT, nextHeight),
                        );
                        return clamped === current ? current : clamped;
                      });
                    }}
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
                        <Icon name="arrowUp" color={colors.canvas} size={16} />
                      )}
                    </Button>
                  ) : (
                    <TouchableOpacity
                      style={styles.voiceButton}
                      onPress={handleStartDictation}
                      accessibilityLabel="Start voice input"
                      activeOpacity={0.85}
                    >
                      <Icon name="mic" color={colors.canvas} size={16} />
                    </TouchableOpacity>
                  )}
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ThinkingBubble() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (value: Animated.Value, delay: number) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return animation;
    };

    const anim1 = createLoop(dot1, 0);
    const anim2 = createLoop(dot2, 120);
    const anim3 = createLoop(dot3, 240);

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const renderDot = (value: Animated.Value, index: number) => {
    const translateY = value.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -2],
    });
    const opacity = value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.thinkingDot,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.thinkingDotsRow}>
      {renderDot(dot1, 1)}
      {renderDot(dot2, 2)}
      {renderDot(dot3, 3)}
    </View>
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
    // Treat the logo + wordmark as a single lockup, with any mode pill
    // sitting directly underneath as a second row so the whole unit reads
    // as one cohesive header.
    flexDirection: 'column',
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: CHAT_COLORS.surface,
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  modePillIcon: {
    marginRight: spacing.xs,
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
  thinkingBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: CHAT_COLORS.assistantBubble,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
    alignSelf: 'flex-start',
  },
  thinkingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CHAT_COLORS.textSecondary,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: CHAT_COLORS.border,
  },
  inputShellRaised: {
    // When the keyboard is visible we tuck the composer closer to it and
    // reduce the exaggerated bottom radius so it visually docks to the top
    // of the keyboard, similar to ChatGPT.
    borderBottomLeftRadius: spacing.lg,
    borderBottomRightRadius: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  inputField: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  input: {
    ...typography.bodySm,
    color: CHAT_COLORS.textPrimary,
    lineHeight: typography.bodySm.lineHeight,
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
    width: 28,
    height: 28,
  },
  voiceButton: {
    backgroundColor: '#18181B',
    borderRadius: 999,
    width: 28,
    height: 28,
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

