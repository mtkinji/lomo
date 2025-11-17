import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  StyleSheet,
  FlatList,
  Modal,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { VStack, Heading, Text, Badge, HStack, Button } from '@gluestack-ui/themed';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography } from '../../theme';
import { defaultForceLevels, useAppStore } from '../../store/useAppStore';
import { ArcsStackParamList } from '../../navigation/RootNavigator';
import { GoalDraft } from '../../domain/types';
import { generateGoals } from '../../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const logArcDetailDebug = (event: string, payload?: Record<string, unknown>) => {
  if (__DEV__) {
    if (payload) {
      console.log(`[arcDetail] ${event}`, payload);
    } else {
      console.log(`[arcDetail] ${event}`);
    }
  }
};

type ArcDetailRouteProp = RouteProp<ArcsStackParamList, 'ArcDetail'>;

const FORCE_LABELS: Record<string, string> = {
  'force-activity': 'Activity',
  'force-connection': 'Connection',
  'force-mastery': 'Mastery',
  'force-spirituality': 'Spirituality',
};

const FORCE_ORDER: Array<keyof typeof FORCE_LABELS> = [
  'force-activity',
  'force-connection',
  'force-mastery',
  'force-spirituality',
];

export function ArcDetailScreen() {
  const route = useRoute<ArcDetailRouteProp>();
  const navigation = useNavigation();
  const { arcId } = route.params;
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const addGoal = useAppStore((state) => state.addGoal);
  const goalRecommendationsMap = useAppStore((state) => state.goalRecommendations);
  const setGoalRecommendations = useAppStore((state) => state.setGoalRecommendations);
  const dismissGoalRecommendation = useAppStore((state) => state.dismissGoalRecommendation);
  const arc = useMemo(() => arcs.find((item) => item.id === arcId), [arcs, arcId]);
  const arcGoals = useMemo(() => goals.filter((goal) => goal.arcId === arcId), [goals, arcId]);
  const recommendations = goalRecommendationsMap[arcId] ?? [];
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchRecommendations = useCallback(async () => {
    if (!arc) return;
    const startedAt = Date.now();
    logArcDetailDebug('recommendations:fetch:start', { arcId: arc.id, arcName: arc.name });
    setLoadingRecommendations(true);
    setRecommendationsError('');
    try {
      const recs = await generateGoals({
        arcName: arc.name,
        arcNarrative: arc.narrative,
        arcNorthStar: arc.northStar,
      });
      logArcDetailDebug('recommendations:fetch:success', {
        durationMs: Date.now() - startedAt,
        resultCount: recs.length,
      });
      setGoalRecommendations(arc.id, recs);
    } catch (err) {
      console.error('Goal recommendations failed', err);
      logArcDetailDebug('recommendations:fetch:error', {
        durationMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : String(err),
      });
      setRecommendationsError('Something went wrong asking LOMO for goals. Try again.');
    } finally {
      setLoadingRecommendations(false);
    }
  }, [arc, setGoalRecommendations]);

  useEffect(() => {
    if (!arc) return;
    if (recommendations.length > 0 || loadingRecommendations || recommendationsError) {
      return;
    }
    fetchRecommendations();
  }, [
    arc,
    recommendations.length,
    loadingRecommendations,
    recommendationsError,
    fetchRecommendations,
  ]);

  if (!arc) {
    return (
      <AppShell>
        <Text style={styles.emptyBody}>Arc not found.</Text>
      </AppShell>
    );
  }

  const handleAdoptGoal = (draft: GoalDraft) => {
    if (!arc) {
      logArcDetailDebug('goal:adopt:skipped-no-arc');
      return;
    }
    logArcDetailDebug('goal:adopt', {
      arcId: arc.id,
      title: draft.title,
      status: draft.status,
    });
    const timestamp = new Date().toISOString();
    const mergedForceIntent = { ...defaultForceLevels(0), ...draft.forceIntent };

    addGoal({
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      arcId: arc.id,
      title: draft.title,
      description: draft.description,
      status: draft.status,
      startDate: timestamp,
      targetDate: undefined,
      forceIntent: mergedForceIntent,
      metrics: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  };

  const handleAdoptRecommendation = (draft: GoalDraft) => {
    if (!arc) {
      logArcDetailDebug('goal:recommendation-adopt:skipped-no-arc');
      return;
    }
    logArcDetailDebug('goal:recommendation-adopt', {
      arcId: arc.id,
      title: draft.title,
    });
    handleAdoptGoal(draft);
    dismissGoalRecommendation(arc.id, draft.title);
  };

  return (
    <AppShell>
      <VStack space="lg">
        <Button variant="link" alignSelf="flex-start" onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back to Arcs</Text>
        </Button>
        <VStack space="sm">
          <Heading style={styles.arcTitle}>{arc.name}</Heading>
          {arc.northStar && <Text style={styles.northStar}>{arc.northStar}</Text>}
          {arc.narrative && <Text style={styles.arcNarrative}>{arc.narrative}</Text>}
          <Badge variant="outline" action="info" alignSelf="flex-start">
            <Text style={styles.badgeText}>{arc.status}</Text>
          </Badge>
        </VStack>

        <VStack space="md">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading style={styles.sectionTitle}>Recommended Goals</Heading>
            <Button variant="link" isDisabled={loadingRecommendations} onPress={fetchRecommendations}>
              <Text style={styles.linkText}>
                {loadingRecommendations ? 'Fetching…' : 'Refresh suggestions'}
              </Text>
            </Button>
          </HStack>

          {recommendationsError ? <Text style={styles.errorText}>{recommendationsError}</Text> : null}

          {loadingRecommendations && (
            <HStack alignItems="center" space="sm">
              <ActivityIndicator color="#38BDF8" />
              <Text style={styles.emptyBody}>Lomo is considering this arc…</Text>
            </HStack>
          )}

          {!loadingRecommendations && !recommendationsError && recommendations.length === 0 ? (
            <Text style={styles.emptyBody}>
              LOMO will offer goal drafts once it has more context. Tap refresh to nudge it.
            </Text>
          ) : null}

          {recommendations.length > 0 && (
            <VStack space="md">
              {recommendations.map((goal) => (
                <VStack key={goal.title} style={styles.recommendationCard} space="sm">
                  <Heading style={styles.goalTitle}>{goal.title}</Heading>
                  {goal.description && <Text style={styles.goalDescription}>{goal.description}</Text>}
                  <Text style={styles.metaText}>Force intent</Text>
                  <HStack style={styles.forceIntentRow}>
                    {FORCE_ORDER.map((force) => (
                      <Text key={force} style={styles.intentChip}>
                        {FORCE_LABELS[force]} · {goal.forceIntent[force] ?? 0}/3
                      </Text>
                    ))}
                  </HStack>
                  {goal.suggestedActivities && goal.suggestedActivities.length > 0 && (
                    <VStack space="xs">
                      {goal.suggestedActivities.map((activity) => (
                        <Text key={activity} style={styles.metaText}>
                          • {activity}
                        </Text>
                      ))}
                    </VStack>
                  )}
                  <HStack space="sm">
                    <Button
                      variant="outline"
                      flex={1}
                      onPress={() => dismissGoalRecommendation(arc.id, goal.title)}
                    >
                      <Text style={styles.linkText}>Dismiss</Text>
                    </Button>
                    <Button flex={1} onPress={() => handleAdoptRecommendation(goal)}>
                      <Text style={styles.buttonText}>Adopt Goal</Text>
                    </Button>
                  </HStack>
                </VStack>
              ))}
            </VStack>
          )}
        </VStack>

        <VStack space="md">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading style={styles.sectionTitle}>
              Goals <Text style={styles.goalCount}>({arcGoals.length})</Text>
            </Heading>
            <Button variant="link" onPress={() => setGoalModalVisible(true)}>
              <Text style={styles.linkText}>New Goal</Text>
            </Button>
          </HStack>

          {arcGoals.length === 0 ? (
            <Text style={styles.emptyBody}>No goals yet for this Arc.</Text>
          ) : (
            <FlatList
              data={arcGoals}
              keyExtractor={(goal) => goal.id}
              ItemSeparatorComponent={() => <VStack style={styles.separator} />}
              renderItem={({ item }) => (
                <VStack style={styles.goalCard}>
                  <Heading style={styles.goalTitle}>{item.title}</Heading>
                  {item.description && <Text style={styles.goalDescription}>{item.description}</Text>}
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.metaText}>{item.status}</Text>
                    <Text style={styles.metaText}>
                      Activity {item.forceIntent['force-activity'] ?? 0}/3 · Mastery{' '}
                      {item.forceIntent['force-mastery'] ?? 0}/3
                    </Text>
                  </HStack>
                </VStack>
              )}
            />
          )}
        </VStack>
      </VStack>
      <NewGoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        arcName={arc.name}
        arcNarrative={arc.narrative}
        arcNorthStar={arc.northStar}
        onAdopt={handleAdoptGoal}
        insetTop={insets.top}
      />
    </AppShell>
  );
}

type NewGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  arcNarrative?: string;
  arcNorthStar?: string;
  onAdopt: (goal: GoalDraft) => void;
  insetTop: number;
};

function NewGoalModal({
  visible,
  onClose,
  arcName,
  arcNarrative,
  arcNorthStar,
  onAdopt,
  insetTop,
}: NewGoalModalProps) {
  const [prompt, setPrompt] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [constraints, setConstraints] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GoalDraft[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setPrompt('');
      setTimeHorizon('');
      setConstraints('');
      setCurrentStep(0);
      setSuggestions([]);
      setError('');
    }
  }, [visible]);

  const QUESTIONS = [
    {
      title: 'What kind of progress would feel meaningful in this Arc?',
      placeholder: 'e.g. mentor younger leaders, grow in stillness, finish a workshop',
      value: prompt,
      onChange: setPrompt,
      required: true,
      multiline: true,
    },
    {
      title: 'Desired time horizon',
      placeholder: 'Next 6 weeks',
      value: timeHorizon,
      onChange: setTimeHorizon,
      required: false,
      multiline: false,
    },
    {
      title: 'Constraints or guidance?',
      placeholder: 'Only evenings, protect Sabbath, keep family involved…',
      value: constraints,
      onChange: setConstraints,
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

  const handleSubmit = async () => {
    if (!isFinalStep) {
      setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
      return;
    }

    const startedAt = Date.now();
    logArcDetailDebug('goalModal:generate:start', {
      arcName,
      promptLength: prompt.length,
      timeHorizon: timeHorizon || null,
      constraintsLength: constraints.length,
    });
    setLoading(true);
    setError('');
    try {
      const results = await generateGoals({
        arcName,
        arcNarrative,
        arcNorthStar,
        prompt,
        timeHorizon,
        constraints,
      });
      logArcDetailDebug('goalModal:generate:success', {
        durationMs: Date.now() - startedAt,
        resultCount: results.length,
      });
      setSuggestions(results);
    } catch (err) {
      console.error('Goal wizard failed', err);
      logArcDetailDebug('goalModal:generate:error', {
        durationMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : String(err),
      });
      setError('Something went wrong asking LOMO. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.xl + insetTop }]}>
          <Heading style={styles.modalTitle}>Ask LOMO for Goal drafts</Heading>
          <Text style={styles.modalBody}>
            Share a bit about the season inside {arcName}. LOMO will suggest concrete goals you can adopt or tweak.
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
                  isDisabled={currentStep === 0}
                  onPress={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  flex={1}
                  marginRight={spacing.sm}
                >
                  <Text style={styles.linkText}>Back</Text>
                </Button>
                <Button flex={1} isDisabled={nextDisabled} onPress={handleSubmit}>
                  <Text style={styles.buttonText}>{isFinalStep ? 'Ask LOMO' : 'Next'}</Text>
                </Button>
              </HStack>
            </>
          )}

          {atLoading && (
            <VStack alignItems="center" space="md" style={{ marginTop: spacing.xl }}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.modalBody}>Drafting goal ideas…</Text>
            </VStack>
          )}

          {atResults && (
            <ScrollView
              style={{ marginTop: spacing.lg }}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
            >
              <Text style={styles.modalLabel}>Suggested Goals</Text>
              <VStack space="md" style={{ marginTop: spacing.sm }}>
                {suggestions.map((suggestion) => (
                  <VStack key={suggestion.title} style={styles.goalCard} space="sm">
                    <Heading style={styles.goalTitle}>{suggestion.title}</Heading>
                    {suggestion.description && (
                      <Text style={styles.goalDescription}>{suggestion.description}</Text>
                    )}
                    <HStack style={styles.forceIntentRow}>
                      {FORCE_ORDER.map((force) => (
                        <Text key={force} style={styles.intentChip}>
                          {FORCE_LABELS[force]} · {suggestion.forceIntent[force] ?? 0}/3
                        </Text>
                      ))}
                    </HStack>
                    <Button variant="outline" onPress={() => onAdopt(suggestion)}>
                      <Text style={styles.linkText}>Adopt Goal</Text>
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

const styles = StyleSheet.create({
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  goalCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcTitle: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  northStar: {
    ...typography.body,
    color: colors.textPrimary,
  },
  arcNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  badgeText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  linkText: {
    ...typography.body,
    color: colors.accent,
  },
  buttonText: {
    ...typography.body,
    color: colors.canvas,
  },
  goalCard: {
    backgroundColor: '#0f172a',
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  goalDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  recommendationCard: {
    backgroundColor: '#0f172a',
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  forceIntentRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  intentChip: {
    ...typography.bodySm,
    color: colors.textSecondary,
    backgroundColor: '#1f2937',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
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
  modalLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

