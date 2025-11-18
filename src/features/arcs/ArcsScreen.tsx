import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  StyleSheet,
  FlatList,
  Modal,
  View,
  TextInput,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { VStack, Heading, Text, Icon as GluestackIcon, HStack, Pressable } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../ui/Icon';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ArcsStackParamList } from '../../navigation/RootNavigator';
import { generateArcs, GeneratedArc } from '../../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../ui/Button';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { Card } from '../../ui/Card';

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
  const navigation = useNavigation<NativeStackNavigationProp<ArcsStackParamList>>();
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeneratedArc[]>([]);
  const [error, setError] = useState('');
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

  return (
    <AppShell>
      <View style={styles.screen}>
        <View
          style={styles.fixedHeader}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        >
          <HStack
            space="lg"
            justifyContent="space-between"
            alignItems="flex-start"
            style={styles.header}
          >
            <VStack space="xs" style={styles.headerText}>
              <HStack alignItems="center" space="sm">
                <View style={styles.screenIconContainer}>
                  <Icon name="arcs" size={18} color={colors.canvas} />
                </View>
                <Heading style={styles.title}>Arcs</Heading>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Learn about arcs"
                  hitSlop={8}
                  onPress={() => setInfoVisible(true)}
                >
                  <Icon name="info" size={18} color={colors.textSecondary} />
                </Pressable>
              </HStack>
            </VStack>
            <Button
              size="icon"
              accessibilityRole="button"
              accessibilityLabel="Create new arc"
              style={styles.newArcButton}
              onPress={() => setIsModalVisible(true)}
            >
              <GluestackIcon as={() => <Icon name="plus" size={16} color="#FFFFFF" />} />
            </Button>
          </HStack>
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
          setPrompt('');
          setTimeHorizon('');
          setAdditionalContext('');
          setSuggestions([]);
          setError('');
          setCurrentStep(0);
        }}
        prompt={prompt}
        setPrompt={setPrompt}
        timeHorizon={timeHorizon}
        setTimeHorizon={setTimeHorizon}
        additionalContext={additionalContext}
        setAdditionalContext={setAdditionalContext}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
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
            const result = await generateArcs({ prompt, timeHorizon, additionalContext });
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
          setPrompt('');
          setTimeHorizon('');
          setAdditionalContext('');
          setSuggestions([]);
          setCurrentStep(0);
        }}
        insetTop={insets.top}
        setSuggestions={setSuggestions}
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
  header: {
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
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
  screenIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    // Use a high-saturation complementary rose tone to the pine green accent
    backgroundColor: colors.accentRoseStrong,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 32,
    padding: spacing.xl,
    marginBottom: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  questionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 60,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  suggestionCard: {
    ...cardSurfaceStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
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
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  timeHorizon: string;
  setTimeHorizon: Dispatch<SetStateAction<string>>;
  additionalContext: string;
  setAdditionalContext: Dispatch<SetStateAction<string>>;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  loading: boolean;
  suggestions: GeneratedArc[];
  error: string;
  onGenerate: () => void;
  onAdopt: (suggestion: GeneratedArc) => void;
  insetTop: number;
  setSuggestions: Dispatch<SetStateAction<GeneratedArc[]>>;
};

function ArcInfoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={0.85}>
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
    </BottomDrawer>
  );
}

function NewArcModal({
  visible,
  onClose,
  prompt,
  setPrompt,
  timeHorizon,
  setTimeHorizon,
  additionalContext,
  setAdditionalContext,
  currentStep,
  setCurrentStep,
  loading,
  suggestions,
  error,
  onGenerate,
  onAdopt,
  insetTop,
  setSuggestions,
}: NewArcModalProps) {
  const QUESTIONS = [
    {
      title: 'Where are you most hungry for growth?',
      placeholder: 'e.g. balancing leadership with health',
      value: prompt,
      onChange: setPrompt,
      required: true,
      multiline: true,
    },
    {
      title: 'Time horizon',
      placeholder: 'Next 90 days',
      value: timeHorizon,
      onChange: setTimeHorizon,
      required: false,
      multiline: false,
    },
    {
      title: 'Any non-negotiables or guidance?',
      placeholder: 'Faith anchors, family priorities, etc.',
      value: additionalContext,
      onChange: setAdditionalContext,
      required: false,
      multiline: true,
    },
  ] as const;

  const atResults = suggestions.length > 0;
  const atLoading = loading;
  const showQuestions = !atResults && !atLoading;
  const totalSteps = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentStep] ?? QUESTIONS[0];
  const isFinalStep = currentStep === totalSteps - 1;
  const nextDisabled =
    currentQuestion.required && currentQuestion.value.trim().length === 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.xl + insetTop }]}>
          <Heading style={styles.modalTitle}>Ask LOMO to draft Arcs</Heading>
          <Text style={styles.modalBody}>
            Answer focused prompts so LOMO can guide you toward the right identity directions.
          </Text>
          {showQuestions && (
            <>
              <Text style={styles.progressText}>
                Step {currentStep + 1} / {totalSteps}
              </Text>
              <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
              <TextInput
                style={[
                  styles.input,
                  currentQuestion.multiline && { minHeight: 120, textAlignVertical: 'top' },
                ]}
                multiline={currentQuestion.multiline}
                placeholder={currentQuestion.placeholder}
                placeholderTextColor="#6B7280"
                value={currentQuestion.value}
                onChangeText={currentQuestion.onChange}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <HStack justifyContent="space-between" marginTop={spacing.lg}>
                <Button
                  variant="outline"
                  disabled={currentStep === 0}
                  onPress={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  style={{ flex: 1, marginRight: spacing.sm }}
                >
                  <Text style={styles.linkText}>Back</Text>
                </Button>
                <Button
                  style={{ flex: 1 }}
                  disabled={nextDisabled}
                  onPress={() => {
                    if (isFinalStep) {
                      onGenerate();
                    } else {
                      setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
                    }
                  }}
                >
                  <Text style={styles.buttonText}>
                    {isFinalStep ? 'Ask LOMO' : 'Next'}
                  </Text>
                </Button>
              </HStack>
            </>
          )}

          {atLoading && (
            <VStack alignItems="center" space="md" style={{ marginTop: spacing.xl }}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.modalBody}>Lomo is considering your season…</Text>
            </VStack>
          )}

          {atResults && (
            <ScrollView
              style={{ marginTop: spacing.lg }}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <Text style={styles.modalLabel}>Suggested Arcs</Text>
              <VStack space="md" style={{ marginTop: spacing.sm }}>
                {suggestions.map((suggestion) => (
                  <VStack key={suggestion.name} style={styles.suggestionCard} space="sm">
                    <Heading style={styles.arcTitle}>{suggestion.name}</Heading>
                    <Text style={styles.goalDescription}>{suggestion.northStar}</Text>
                    <Text style={styles.arcNarrative}>{suggestion.narrative}</Text>
                    <Button variant="outline" onPress={() => onAdopt(suggestion)}>
                      <Text style={styles.linkText}>Adopt Arc</Text>
                    </Button>
                  </VStack>
                ))}
              </VStack>
              <Button
                variant="link"
                onPress={() => {
                  setSuggestions([]);
                  setCurrentStep(0);
                }}
                style={{ marginTop: spacing.lg }}
              >
                <Text style={styles.linkText}>Ask again</Text>
              </Button>
            </ScrollView>
          )}

          <Button variant="link" onPress={onClose} style={{ marginTop: spacing.lg }}>
            <Text style={styles.linkText}>Close</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


