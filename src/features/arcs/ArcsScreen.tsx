import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { DrawerActions, useNavigation as useRootNavigation } from '@react-navigation/native';
import { VStack, Heading, Text, Icon as GluestackIcon, HStack, Pressable } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../ui/Icon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ArcsStackParamList, RootDrawerParamList } from '../../navigation/RootNavigator';
import { generateArcs, GeneratedArc } from '../../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../ui/Button';
import { LomoBottomSheet } from '../../ui/BottomSheet';
import { Card } from '../../ui/Card';
import { Logo } from '../../ui/Logo';
import { CHAT_MODE_REGISTRY } from '../ai/chatRegistry';

const logArcsDebug = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) {
    if (payload) {
      console.log(`[arcs] ${event}`, payload);
    } else {
      console.log(`[arcs] ${event}`);
    }
  }
};

export function ArcsScreen() {
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const addArc = useAppStore((state) => state.addArc);
  const navigation = useRootNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const drawerNavigation = useRootNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeneratedArc[]>([]);
  const [error, setError] = useState('');
  const resetArcConversation = () => {
    setPrompt('');
    setTimeHorizon('');
    setAdditionalContext('');
    setSuggestions([]);
    setError('');
  };
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    if (__DEV__) {
      console.log('ArcsScreen rendered');
    }
  }, []);

  const empty = arcs.length === 0;

  const goalCountByArc = useMemo(() => {
    return goals.reduce<Record<string, number>>((acc, goal) => {
      acc[goal.arcId] = (acc[goal.arcId] ?? 0) + 1;
      return acc;
    }, {});
  }, [goals]);

  const activityCountByArc = useMemo(() => {
    const counts: Record<string, number> = {};
    const goalArcLookup = goals.reduce<Record<string, string>>((acc, goal) => {
      acc[goal.id] = goal.arcId;
      return acc;
    }, {});
    activities.forEach((activity) => {
      const arcId = activity.goalId ? goalArcLookup[activity.goalId] : undefined;
      if (!arcId) return;
      counts[arcId] = (counts[arcId] ?? 0) + 1;
    });
    return counts;
  }, [activities, goals]);
  const listTopPadding = headerHeight ? headerHeight + spacing.md : spacing['2xl'];
  const hideScrollIndicator = arcs.length <= 5;

  const arcWorkspaceContextSummary = () => {
    const arcCount = arcs.length;
    const goalCount = goals.length;
    const activityCount = activities.length;

    const arcNamesPreview =
      arcCount === 0
        ? 'none yet'
        : arcs
            .slice(0, 5)
            .map((arc) => arc.name)
            .join(', ');

    return [
      'Current arcs workspace snapshot:',
      `- Existing Arcs (${arcCount}): ${arcNamesPreview}`,
      `- Total Goals: ${goalCount}`,
      `- Total Activities: ${activityCount}`,
    ].join('\n');
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <View
          style={styles.fixedHeader}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          <PageHeader
            title="Arcs"
            menuOpen={menuOpen}
            onPressMenu={() => drawerNavigation.dispatch(DrawerActions.openDrawer())}
            onPressInfo={() => setInfoVisible(true)}
            rightElement={
              <Button
                size="icon"
                accessibilityRole="button"
                accessibilityLabel="Ask LOMO to create a new Arc"
                style={styles.newArcButton}
                onPress={() => setIsModalVisible(true)}
              >
                <GluestackIcon as={() => <Icon name="plus" size={16} color="#FFFFFF" />} />
              </Button>
            }
          />
        </View>
        <FlatList
          style={styles.list}
          data={arcs}
          keyExtractor={(arc) => arc.id}
          ItemSeparatorComponent={() => <VStack style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: spacing.md,
              paddingTop: listTopPadding,
            },
            empty && styles.listEmptyContent,
          ]}
          ListEmptyComponent={
            <VStack space="sm" style={styles.emptyState}>
              <Heading style={styles.emptyTitle}>No arcs yet</Heading>
              <Text style={styles.emptyBody}>
                Arcs are long-horizon identity directions like Discipleship, Family Stewardship, or
                Making &amp; Embodied Creativity. We&apos;ll use AI to help you define them.
              </Text>
            </VStack>
          }
          renderItem={({ item }) => {
            const goalCount = goalCountByArc[item.id] ?? 0;
            const activityCount = activityCountByArc[item.id] ?? 0;
            return (
              <Pressable onPress={() => navigation.navigate('ArcDetail', { arcId: item.id })}>
                <Card style={styles.arcCard}>
                  <VStack space="sm">
                    <Heading style={styles.arcTitle}>{item.name}</Heading>
                    {item.narrative && <Text style={styles.arcNarrative}>{item.narrative}</Text>}
                    <HStack space="lg" style={styles.arcMetaRow} alignItems="center">
                      <HStack space="xs" alignItems="center">
                        <Icon name="goals" size={14} color={colors.textSecondary} />
                        <Text style={styles.arcStatValue}>{goalCount}</Text>
                        <Text style={styles.arcStatLabel}>
                          {goalCount === 1 ? 'Goal' : 'Goals'}
                        </Text>
                      </HStack>
                      <HStack space="xs" alignItems="center">
                        <Icon name="activities" size={14} color={colors.textSecondary} />
                        <Text style={styles.arcStatValue}>{activityCount}</Text>
                        <Text style={styles.arcStatLabel}>
                          {activityCount === 1 ? 'Activity' : 'Activities'}
                        </Text>
                      </HStack>
                    </HStack>
                  </VStack>
                </Card>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={!hideScrollIndicator}
        />
      </View>
      <ArcInfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
      <NewArcModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          resetArcConversation();
        }}
        setPrompt={setPrompt}
        setTimeHorizon={setTimeHorizon}
        setAdditionalContext={setAdditionalContext}
        loading={loading}
        suggestions={suggestions}
        error={error}
        onGenerate={async () => {
          const startedAt = Date.now();
          logArcsDebug('newArc:generate:start', {
            promptLength: prompt.length,
            timeHorizon: timeHorizon || null,
            additionalContextLength: additionalContext.length,
          });
          setLoading(true);
          setError('');
          try {
            const registryEntry = CHAT_MODE_REGISTRY.arcCreation;
            const combinedAdditionalContext = [
              additionalContext.trim().length > 0
                ? `User-provided constraints / non-negotiables:\n${additionalContext.trim()}`
                : '',
              arcWorkspaceContextSummary(),
              `Mode: ${registryEntry.label} (${registryEntry.mode})`,
            ]
              .filter(Boolean)
              .join('\n\n');

            const result = await generateArcs({
              prompt,
              timeHorizon,
              additionalContext: combinedAdditionalContext,
            });
            logArcsDebug('newArc:generate:success', {
              durationMs: Date.now() - startedAt,
              suggestionNames: result.map((suggestion) => suggestion.name),
            });
            setSuggestions(result);
          } catch (err) {
            console.error('generateArcs failed', err);
            logArcsDebug('newArc:generate:error', {
              durationMs: Date.now() - startedAt,
              message: err instanceof Error ? err.message : String(err),
            });
            setError('Something went wrong asking LOMO. Try again.');
          } finally {
            setLoading(false);
          }
        }}
        onAdopt={(suggestion) => {
          logArcsDebug('newArc:adopt', {
            name: suggestion.name,
            status: suggestion.status,
          });
          const now = new Date().toISOString();
          addArc({
            id: `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: suggestion.name,
            narrative: suggestion.narrative,
            northStar: suggestion.northStar,
            status: suggestion.status,
            startDate: now,
            endDate: null,
            createdAt: now,
            updatedAt: now,
          });
          setIsModalVisible(false);
          resetArcConversation();
        }}
        insetTop={insets.top}
        onResetConversation={resetArcConversation}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Prevent cards from peeking above the fixed header into the safe area
    overflow: 'hidden',
  },
  list: {
    flex: 1,
    // Let the list inherit the app shell / canvas background so it doesn’t look like a separate panel
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  listContent: {
    paddingBottom: spacing.xl,
    paddingHorizontal: 0,
  },
  listEmptyContent: {
    flexGrow: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    // Header floats above the Light Canvas with a subtle tint
    backgroundColor: colors.shell,
  },
  emptyState: {
    marginTop: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  buttonText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
  newArcButton: {
    alignSelf: 'flex-start',
    marginTop: 0,
    width: 36,
    height: 36,
  },
  arcCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    // Let the app shell define horizontal gutters so cards align with the header
    marginHorizontal: 0,
    // Use the base card vertical spacing so lists stay consistent across screens
    marginVertical: 0,
  },
  arcTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    // Use heavy weight while keeping the more compact titleSm size
    fontFamily: 'Inter_800ExtraBold',
  },
  arcNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcMetaRow: {
    marginTop: spacing.xs,
  },
  arcStatValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  arcStatLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 32,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  drawerKeyboardContainer: {
    flex: 1,
  },
  drawerContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
    ...typography.brand,
    color: colors.textPrimary,
  },
  brandSubLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sheetHandle: {
    backgroundColor: colors.border,
    width: 64,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  infoSheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  modalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  progressText: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  conversationContainer: {
    flex: 1,
    marginTop: spacing.md,
  },
  conversationScroll: {
    flex: 1,
  },
  conversationContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  messageBubble: {
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.shellAlt,
  },
  statusBubble: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  messageText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  composerSection: {
    marginTop: spacing.lg,
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickReplyButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shell,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 0,
  },
  quickReplyText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    minHeight: 80,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  composerSendButton: {
    minHeight: 52,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  skipButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  errorBubble: {
    backgroundColor: colors.schedulePink,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  errorLabel: {
    color: colors.warning,
  },
  errorTextColor: {
    color: colors.textPrimary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  suggestionCard: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  chatSuggestionCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    flex: 1,
  },
  linkText: {
    ...typography.bodySm,
    color: colors.accent,
    fontWeight: '600',
  },
});

type NewArcModalProps = {
  visible: boolean;
  onClose: () => void;
  setPrompt: Dispatch<SetStateAction<string>>;
  setTimeHorizon: Dispatch<SetStateAction<string>>;
  setAdditionalContext: Dispatch<SetStateAction<string>>;
  loading: boolean;
  suggestions: GeneratedArc[];
  error: string;
  onGenerate: () => void;
  onAdopt: (suggestion: GeneratedArc) => void;
  insetTop: number;
  onResetConversation: () => void;
};

type ArcConversationField = 'prompt' | 'timeHorizon' | 'additionalContext';

type ConversationStep = {
  id: ArcConversationField;
  title: string;
  helper: string;
  placeholder: string;
  suggestions?: string[];
  required?: boolean;
};

type ConversationMessage =
  | {
      id: string;
      role: 'assistant' | 'user';
      type: 'text' | 'status';
      content: string;
      helper?: string;
    }
  | {
      id: string;
      role: 'assistant';
      type: 'error';
      content: string;
    }
  | {
      id: string;
      role: 'assistant';
      type: 'suggestions';
      arcs: GeneratedArc[];
    };

const ARC_CONVERSATION_STEPS: ConversationStep[] = [
  {
    id: 'prompt',
    title: 'Where are you feeling the strongest hunger for growth?',
    helper: 'Name the tension tugging at you—identity, craft, relationship, or stewardship.',
    placeholder: 'e.g. Leading a team but losing my maker instincts',
    suggestions: [
      'Balancing leadership pace with health',
      'Reclaiming creative confidence',
      'Rooting family rhythms while scaling work',
    ],
    required: true,
  },
  {
    id: 'timeHorizon',
    title: 'What time horizon should we shape this Arc around?',
    helper: 'Give your Arc edges: a quarter, season, sabbatical window, or ritual cycle.',
    placeholder: 'Next 90 days',
    suggestions: ['Next 90 days', 'This year', 'Summer sabbatical'],
  },
  {
    id: 'additionalContext',
    title: 'Any non-negotiables or anchors I should honor?',
    helper: 'Think faith rhythms, family commitments, health guardrails, or values.',
    placeholder: 'Weekly sabbath + family dinners two nights/week',
    suggestions: ['Keep sabbath & strength training', 'Prioritize family dinners', 'Protect deep work mornings'],
  },
];

const createMessageId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function ArcInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <LomoBottomSheet visible={visible} onClose={onClose} snapPoints={['55%']}>
      <Heading style={styles.infoTitle}>What is an Arc?</Heading>
      <Text style={styles.infoBody}>
        An Arc is a long-horizon identity direction—like Discipleship, Craft, or Family Stewardship.
        Each Arc anchors the season you&apos;re in, guides your goals, and keeps your activities
        accountable to who you&apos;re becoming.
      </Text>
      <Text style={styles.infoBody}>
        Capture a few Arcs to frame the next few months. You can add or archive them as your story
        shifts.
      </Text>
      <Button style={{ marginTop: spacing.lg }} onPress={onClose}>
        <Text style={styles.buttonText}>Got it</Text>
      </Button>
    </LomoBottomSheet>
  );
}

function NewArcModal({
  visible,
  onClose,
  setPrompt,
  setTimeHorizon,
  setAdditionalContext,
  loading,
  suggestions,
  error,
  onGenerate,
  onAdopt,
  insetTop,
  onResetConversation,
}: NewArcModalProps) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [sessionId, setSessionId] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const errorRef = useRef('');
  const suggestionsShownRef = useRef(false);

  const totalSteps = ARC_CONVERSATION_STEPS.length;
  const currentQuestion = ARC_CONVERSATION_STEPS[questionIndex];
  const setterMap: Record<ArcConversationField, Dispatch<SetStateAction<string>>> = {
    prompt: setPrompt,
    timeHorizon: setTimeHorizon,
    additionalContext: setAdditionalContext,
  };

  const initializeConversation = () => {
    if (!visible) {
      return;
    }
    const firstQuestion = ARC_CONVERSATION_STEPS[0];
    const introMessage: ConversationMessage = {
      id: createMessageId('intro'),
      role: 'assistant',
      type: 'text',
      content: "Let's co-author your next Arc. I'll ask a few prompts—answer like we're in session.",
    };
    const questionMessage: ConversationMessage = {
      id: createMessageId('question'),
      role: 'assistant',
      type: 'text',
      content: firstQuestion.title,
      helper: firstQuestion.helper,
    };
    setMessages([introMessage, questionMessage]);
    setComposerValue('');
    setQuestionIndex(0);
    errorRef.current = '';
    suggestionsShownRef.current = false;
  };

  useEffect(() => {
    if (visible) {
      initializeConversation();
    } else {
      setMessages([]);
      setComposerValue('');
      setQuestionIndex(0);
    }
  }, [visible, sessionId]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, loading, suggestions, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (error && error !== errorRef.current) {
      errorRef.current = error;
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId('error'),
          role: 'assistant',
          type: 'error',
          content: error,
        },
      ]);
    }
    if (!error) {
      errorRef.current = '';
    }
  }, [error, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (suggestions.length > 0 && !suggestionsShownRef.current) {
      suggestionsShownRef.current = true;
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId('suggestions'),
          role: 'assistant',
          type: 'suggestions',
          arcs: suggestions,
        },
      ]);
    }
    if (suggestions.length === 0) {
      suggestionsShownRef.current = false;
    }
  }, [suggestions, visible]);

  const submitAnswer = async (value: string, displayValue?: string) => {
    if (!currentQuestion || loading) {
      return;
    }
    const trimmed = value.trim();
    if (currentQuestion.required && trimmed.length === 0) {
      return;
    }

    setterMap[currentQuestion.id](trimmed);
    const shownContent =
      (displayValue ?? trimmed).trim().length > 0 ? (displayValue ?? trimmed) : 'Skip for now';
    const isLastQuestion = questionIndex === totalSteps - 1;

    setMessages((prev) => {
      const updated: ConversationMessage[] = [
        ...prev,
        {
          id: createMessageId('user'),
          role: 'user',
          type: 'text',
          content: shownContent,
        },
      ];
      if (isLastQuestion) {
        updated.push({
          id: createMessageId('status'),
          role: 'assistant',
          type: 'status',
          content: "Got it—give me a beat to translate that into Arcs.",
        });
      } else {
        const nextQuestion = ARC_CONVERSATION_STEPS[questionIndex + 1];
        updated.push({
          id: createMessageId('question'),
          role: 'assistant',
          type: 'text',
          content: nextQuestion.title,
          helper: nextQuestion.helper,
        });
      }
      return updated;
    });

    setComposerValue('');
    if (isLastQuestion) {
      setQuestionIndex(totalSteps);
      await onGenerate();
    } else {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  const handleSend = () => {
    if (!currentQuestion) {
      return;
    }
    void submitAnswer(composerValue);
  };

  const handleSkip = () => {
    if (!currentQuestion || currentQuestion.required) {
      return;
    }
    void submitAnswer('', 'Skip for now');
  };

  const restartConversation = () => {
    onResetConversation();
    setSessionId((prev) => prev + 1);
  };

  const handleRetryGenerate = () => {
    if (loading) {
      return;
    }
    void onGenerate();
  };

  const canSend = composerValue.trim().length > 0 && Boolean(currentQuestion) && !loading;
  const showComposer = Boolean(currentQuestion) && suggestions.length === 0;
  const composerPlaceholder = currentQuestion?.placeholder ?? 'Add anything else for LOMO';

  const renderMessage = (message: ConversationMessage) => {
    if (message.type === 'suggestions') {
      return (
        <View key={message.id} style={[styles.messageBubble, styles.assistantBubble]}>
          <Text style={styles.messageMeta}>LOMO</Text>
          <Text style={[styles.messageText, { marginBottom: spacing.sm }]}>
            Here are Arcs that match what you shared.
          </Text>
          <VStack space="md">
            {message.arcs.map((suggestion) => (
              <VStack
                key={`${suggestion.name}-${suggestion.status}`}
                style={[styles.suggestionCard, styles.chatSuggestionCard]}
                space="sm"
              >
                <Heading style={styles.arcTitle}>{suggestion.name}</Heading>
                <Text style={styles.goalDescription}>{suggestion.northStar}</Text>
                <Text style={styles.arcNarrative}>{suggestion.narrative}</Text>
                <Button variant="outline" onPress={() => onAdopt(suggestion)}>
                  <Text style={styles.linkText}>Adopt Arc</Text>
                </Button>
              </VStack>
            ))}
          </VStack>
          <Button variant="link" onPress={restartConversation} style={{ alignSelf: 'flex-start' }}>
            <Text style={styles.linkText}>Ask for another take</Text>
          </Button>
        </View>
      );
    }

    if (message.type === 'error') {
      return (
        <View key={message.id} style={[styles.messageBubble, styles.errorBubble]}>
          <Text style={[styles.messageMeta, styles.errorLabel]}>LOMO</Text>
          <Text style={[styles.messageText, styles.errorTextColor]}>{message.content}</Text>
          <Button variant="outline" onPress={handleRetryGenerate} style={styles.retryButton}>
            <Text style={styles.linkText}>Try again</Text>
          </Button>
        </View>
      );
    }

    const bubbleStyle = [
      styles.messageBubble,
      message.role === 'user' ? styles.userBubble : styles.assistantBubble,
      message.type === 'status' && styles.statusBubble,
    ];

    return (
      <View key={message.id} style={bubbleStyle}>
        <Text style={styles.messageMeta}>{message.role === 'user' ? 'You' : 'LOMO'}</Text>
        <Text style={styles.messageText}>{message.content}</Text>
        {message.helper ? <Text style={styles.helperText}>{message.helper}</Text> : null}
      </View>
    );
  };

  return (
    <LomoBottomSheet visible={visible} onClose={onClose} snapPoints={['90%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? spacing.xl : 0}
        style={styles.drawerKeyboardContainer}
      >
        <View style={[styles.drawerContent, { paddingTop: spacing.lg }]}>
          <View style={styles.sheetHeaderRow}>
            <View style={styles.brandLockup}>
              <Logo size={28} />
              <View style={styles.brandTextBlock}>
                <Text style={styles.brandWordmark}>LOMO</Text>
                <Text style={styles.brandSubLabel}>Season coach</Text>
              </View>
            </View>
          </View>

          <Heading style={styles.modalTitle}>Ask LOMO to draft Arcs</Heading>
          <Text style={styles.modalBody}>
            Treat this like a coaching chat. LOMO will listen, ask follow-ups, and draft Arcs that
            match your season.
          </Text>

          <View style={styles.conversationContainer}>
            <ScrollView
              ref={scrollRef}
              style={styles.conversationScroll}
              contentContainerStyle={styles.conversationContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message) => renderMessage(message))}
              {loading ? (
                <View style={[styles.messageBubble, styles.assistantBubble]}>
                  <Text style={styles.messageMeta}>LOMO</Text>
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={[styles.messageText, styles.loadingText]}>
                      Drafting Arcs for this season…
                    </Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>

          {showComposer && currentQuestion ? (
            <View style={styles.composerSection}>
              <Text style={styles.progressText}>
                Step {Math.min(questionIndex + 1, totalSteps)} / {totalSteps}
              </Text>
              {currentQuestion.suggestions && currentQuestion.suggestions.length > 0 ? (
                <View style={styles.quickReplies}>
                  {currentQuestion.suggestions.map((option) => (
                    <Button
                      key={option}
                      variant="ghost"
                      style={styles.quickReplyButton}
                      onPress={() => void submitAnswer(option)}
                      disabled={loading}
                    >
                      <Text style={styles.quickReplyText}>{option}</Text>
                    </Button>
                  ))}
                </View>
              ) : null}
              <View style={styles.composerRow}>
                <TextInput
                  style={styles.composerInput}
                  multiline
                  placeholder={composerPlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  value={composerValue}
                  onChangeText={setComposerValue}
                  textAlignVertical="top"
                  accessibilityLabel='Respond to LOMO'
                />
                <Button
                  style={styles.composerSendButton}
                  disabled={!canSend}
                  onPress={handleSend}
                >
                  <Text style={styles.buttonText}>Send</Text>
                </Button>
              </View>
              {!currentQuestion.required ? (
                <Button variant="link" onPress={handleSkip} style={styles.skipButton}>
                  <Text style={styles.linkText}>Skip this</Text>
                </Button>
              ) : null}
            </View>
          ) : null}

          {suggestions.length > 0 ? (
            <Button variant="link" onPress={restartConversation} style={{ marginTop: spacing.md }}>
              <Text style={styles.linkText}>Start another Arc conversation</Text>
            </Button>
          ) : null}

          <Button variant="link" onPress={onClose} style={{ marginTop: spacing.lg }}>
            <Text style={styles.linkText}>Close</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </LomoBottomSheet>
  );
}


