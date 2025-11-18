import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  StyleSheet,
  Modal,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { VStack, Heading, Text, HStack } from '@gluestack-ui/themed';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { defaultForceLevels, useAppStore } from '../../store/useAppStore';
import { GoalDraft } from '../../domain/types';
import { generateGoals } from '../../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ArcsStackParamList } from '../../navigation/RootNavigator';

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
type ArcDetailNavigationProp = NativeStackNavigationProp<ArcsStackParamList, 'ArcDetail'>;

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
  const navigation = useNavigation<ArcDetailNavigationProp>();
  const { arcId } = route.params;
  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const addGoal = useAppStore((state) => state.addGoal);
  const updateArc = useAppStore((state) => state.updateArc);
  const removeArc = useAppStore((state) => state.removeArc);
  const goalRecommendationsMap = useAppStore((state) => state.goalRecommendations);
  const setGoalRecommendations = useAppStore((state) => state.setGoalRecommendations);
  const dismissGoalRecommendation = useAppStore((state) => state.dismissGoalRecommendation);
  const arc = useMemo(() => arcs.find((item) => item.id === arcId), [arcs, arcId]);
  const arcGoals = useMemo(() => goals.filter((goal) => goal.arcId === arcId), [goals, arcId]);
  const recommendations = goalRecommendationsMap[arcId] ?? [];
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState('');
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [recommendationsModalVisible, setRecommendationsModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'northStar' | 'narrative' | null>(
    null
  );
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNorthStar, setEditNorthStar] = useState('');
  const [editNarrative, setEditNarrative] = useState('');
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

  const openEditArcModal = useCallback(() => {
    if (!arc) return;
    setEditName(arc.name);
    setEditNorthStar(arc.northStar ?? '');
    setEditNarrative(arc.narrative ?? '');
    setEditModalVisible(true);
  }, [arc]);

  const handleDeleteArc = useCallback(() => {
    if (!arc) return;
    removeArc(arc.id);
    navigation.goBack();
  }, [arc, removeArc, navigation]);

  const confirmDeleteArc = useCallback(() => {
    if (!arc) return;
    Alert.alert(
      'Delete arc?',
      'This will remove the arc and related goals.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteArc },
      ]
    );
  }, [arc, handleDeleteArc]);

  const handleSaveArcDetails = useCallback(
    (values: { name: string; northStar?: string; narrative?: string }) => {
      if (!arc) return;
      const timestamp = new Date().toISOString();
      updateArc(arc.id, (prev) => ({
        ...prev,
        name: values.name.trim(),
        northStar: values.northStar?.trim() || undefined,
        narrative: values.narrative?.trim() || undefined,
        updatedAt: timestamp,
      }));
      setEditModalVisible(false);
    },
    [arc, updateArc]
  );

  const beginInlineEdit = useCallback(
    (field: 'name' | 'northStar' | 'narrative') => {
      if (!arc) return;
      // If another field is currently editing, first commit that change.
      if (editingField && editingField !== field) {
        commitInlineEdit();
        return;
      }

      setEditingField(field);
      if (field === 'name') {
        setEditName(arc.name);
      } else if (field === 'northStar') {
        setEditNorthStar(arc.northStar ?? '');
      } else if (field === 'narrative') {
        setEditNarrative(arc.narrative ?? '');
      }
    },
    [arc, editingField, commitInlineEdit]
  );

  const commitInlineEdit = useCallback(() => {
    if (!arc || !editingField) {
      setEditingField(null);
      return;
    }

    const timestamp = new Date().toISOString();

    if (editingField === 'name') {
      const nextName = editName.trim();
      if (!nextName || nextName === arc.name) {
        setEditingField(null);
        return;
      }
      updateArc(arc.id, (prev) => ({
        ...prev,
        name: nextName,
        updatedAt: timestamp,
      }));
    } else if (editingField === 'northStar') {
      const nextNorthStar = editNorthStar.trim();
      if (nextNorthStar === (arc.northStar ?? '')) {
        setEditingField(null);
        return;
      }
      updateArc(arc.id, (prev) => ({
        ...prev,
        northStar: nextNorthStar || undefined,
        updatedAt: timestamp,
      }));
    } else if (editingField === 'narrative') {
      const nextNarrative = editNarrative.trim();
      if (nextNarrative === (arc.narrative ?? '')) {
        setEditingField(null);
        return;
      }
      updateArc(arc.id, (prev) => ({
        ...prev,
        narrative: nextNarrative || undefined,
        updatedAt: timestamp,
      }));
    }

    setEditingField(null);
  }, [arc, editingField, editName, editNorthStar, editNarrative, updateArc]);

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
      {editingField && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.inlineEditOverlay}
          onPress={commitInlineEdit}
        />
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VStack space="lg">
          <HStack justifyContent="space-between" alignItems="center">
            <Button
              size="icon"
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Back to Arcs"
            >
              <Icon name="arrowLeft" size={20} color={colors.canvas} strokeWidth={2.5} />
            </Button>
            <Button
              size="icon"
              style={styles.optionsButton}
              accessibilityLabel="Arc options"
              onPress={() => setOptionsMenuVisible((prev) => !prev)}
            >
              <Icon name="more" size={18} color={colors.canvas} />
            </Button>
          </HStack>
          <HStack justifyContent="space-between" alignItems="flex-start" space="md">
            <VStack space="sm" flex={1}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => beginInlineEdit('name')}
                accessibilityRole="button"
                accessibilityLabel="Edit arc title"
              >
                <View
                  style={[
                    styles.editableField,
                    editingField === 'name' && styles.editableFieldActive,
                  ]}
                >
                  {editingField === 'name' ? (
                    <TextInput
                      style={styles.arcTitleInput}
                      value={editName}
                      onChangeText={setEditName}
                      autoFocus
                      multiline
                      scrollEnabled={false}
                      onBlur={commitInlineEdit}
                    />
                  ) : (
                    <Heading style={styles.arcTitle}>{arc.name}</Heading>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => beginInlineEdit('northStar')}
                accessibilityRole="button"
                accessibilityLabel="Edit north star"
              >
                <View
                  style={[
                    styles.editableField,
                    editingField === 'northStar' && styles.editableFieldActive,
                  ]}
                >
                  {editingField === 'northStar' ? (
                    <TextInput
                      style={styles.northStarInput}
                      value={editNorthStar}
                      onChangeText={setEditNorthStar}
                      placeholder="Add a north star"
                      placeholderTextColor="#6B7280"
                      autoFocus
                      multiline
                      scrollEnabled={false}
                      onBlur={commitInlineEdit}
                    />
                  ) : (
                    arc.northStar && <Text style={styles.northStar}>{arc.northStar}</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => beginInlineEdit('narrative')}
                accessibilityRole="button"
                accessibilityLabel="Edit narrative"
              >
                <View
                  style={[
                    styles.editableField,
                    editingField === 'narrative' && styles.editableFieldActive,
                  ]}
                >
                  {editingField === 'narrative' ? (
                    <TextInput
                      style={[styles.arcNarrativeInput, { textAlignVertical: 'top' }]}
                      value={editNarrative}
                      onChangeText={setEditNarrative}
                      placeholder="Add a narrative for this arc"
                      placeholderTextColor="#6B7280"
                      multiline
                      scrollEnabled={false}
                      autoFocus
                      onBlur={commitInlineEdit}
                    />
                  ) : (
                    arc.narrative && <Text style={styles.arcNarrative}>{arc.narrative}</Text>
                  )}
                </View>
              </TouchableOpacity>
            </VStack>
          </HStack>

          <VStack space="md">
            <HStack justifyContent="space-between" alignItems="center">
              <Heading style={styles.sectionTitle}>
                Goals <Text style={styles.goalCount}>({arcGoals.length})</Text>
              </Heading>
              <Button variant="link" onPress={() => setGoalModalVisible(true)}>
                <Text style={styles.linkText}>New Goal</Text>
              </Button>
            </HStack>

          {recommendations.length > 0 && (
            <Button
              variant="ai"
              style={styles.recommendationsEntryButton}
              onPress={() => setRecommendationsModalVisible(true)}
            >
              <Icon name="arcs" size={18} color={colors.canvas} />
              <Text style={styles.recommendationsEntryText}>
                View {recommendations.length} recommendation
                {recommendations.length > 1 ? 's' : ''}
              </Text>
            </Button>
          )}

            {arcGoals.length === 0 ? (
              <Text style={styles.emptyBody}>No goals yet for this Arc.</Text>
            ) : (
              <VStack space="md">
                {arcGoals.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
                  >
                    <VStack style={styles.goalCard}>
                      <Heading style={styles.goalTitle}>{item.title}</Heading>
                      {item.description && (
                        <Text style={styles.goalDescription}>{item.description}</Text>
                      )}
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text style={styles.metaText}>{item.status}</Text>
                        <Text style={styles.metaText}>
                          Activity {item.forceIntent['force-activity'] ?? 0}/3 · Mastery{' '}
                          {item.forceIntent['force-mastery'] ?? 0}/3
                        </Text>
                      </HStack>
                    </VStack>
                  </TouchableOpacity>
                ))}
              </VStack>
            )}
          </VStack>
        </VStack>
      </ScrollView>
      <NewGoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        arcName={arc.name}
        arcNarrative={arc.narrative}
        arcNorthStar={arc.northStar}
        onAdopt={handleAdoptGoal}
        insetTop={insets.top}
      />
      <EditArcModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        initialName={arc.name}
        initialNorthStar={arc.northStar}
        initialNarrative={arc.narrative}
        onSubmit={handleSaveArcDetails}
        insetTop={insets.top}
      />
      {optionsMenuVisible && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.optionsMenuOverlay}
          onPress={() => setOptionsMenuVisible(false)}
        >
          <View style={styles.optionsMenuContainer}>
            <View style={styles.optionsMenu}>
              <Text style={styles.optionsMenuLabel}>Arc actions</Text>
              <View style={styles.optionsMenuSeparator} />
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.optionsMenuItem}
                onPress={() => {
                  setOptionsMenuVisible(false);
                  confirmDeleteArc();
                }}
              >
                <Text style={styles.optionsMenuItemDestructiveText}>Delete arc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}
      <Modal
        visible={recommendationsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRecommendationsModalVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            styles.recommendationsOverlay,
            { paddingTop: insets.top },
          ]}
        >
          <View style={[styles.recommendationsModalContent, { paddingTop: spacing.xl }]}>
            <VStack space="md">
              <HStack justifyContent="space-between" alignItems="center">
                <Heading style={styles.sectionTitle}>Recommended Goals</Heading>
                <HStack alignItems="center" space="sm">
                  <Button
                    variant="link"
                    disabled={loadingRecommendations}
                    onPress={fetchRecommendations}
                  >
                    <Text style={styles.linkText}>
                      {loadingRecommendations ? 'Fetching…' : 'Refresh suggestions'}
                    </Text>
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    style={styles.recommendationsCloseButton}
                    onPress={() => setRecommendationsModalVisible(false)}
                    accessibilityLabel="Close recommended goals"
                  >
                    <Icon name="more" size={18} color={colors.textPrimary} />
                  </Button>
                </HStack>
              </HStack>

              {recommendationsError ? (
                <Text style={styles.errorText}>{recommendationsError}</Text>
              ) : null}

              {loadingRecommendations && (
                <HStack alignItems="center" space="sm">
                  <ActivityIndicator color="#38BDF8" />
                  <Text style={styles.emptyBody}>Lomo is considering this arc…</Text>
                </HStack>
              )}

              {!loadingRecommendations &&
              !recommendationsError &&
              recommendations.length === 0 ? (
                <Text style={styles.emptyBody}>
                  LOMO will offer goal drafts once it has more context. Tap refresh to nudge it.
                </Text>
              ) : null}

              {recommendations.length > 0 && (
                <ScrollView
                  style={{ marginTop: spacing.sm }}
                  contentContainerStyle={{ paddingBottom: spacing.lg }}
                >
                  <VStack space="md">
                    {recommendations.map((goal) => (
                      <VStack key={goal.title} style={styles.recommendationCard} space="sm">
                        <Heading style={styles.goalTitle}>{goal.title}</Heading>
                        {goal.description && (
                          <Text style={styles.goalDescription}>{goal.description}</Text>
                        )}
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
                            style={{ flex: 1 }}
                            onPress={() => dismissGoalRecommendation(arc.id, goal.title)}
                          >
                            <Text style={styles.linkText}>Dismiss</Text>
                          </Button>
                          <Button
                            variant="accent"
                            style={{ flex: 1 }}
                            onPress={() => handleAdoptRecommendation(goal)}
                          >
                            <Text style={styles.buttonText}>Adopt Goal</Text>
                          </Button>
                        </HStack>
                      </VStack>
                    ))}
                  </VStack>
                </ScrollView>
              )}

              <Button
                variant="link"
                onPress={() => setRecommendationsModalVisible(false)}
                style={{ marginTop: spacing.sm }}
              >
                <Text style={styles.linkText}>Close</Text>
              </Button>
            </VStack>
          </View>
        </View>
      </Modal>
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

type EditArcModalProps = {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialNorthStar?: string;
  initialNarrative?: string;
  onSubmit: (values: { name: string; northStar?: string; narrative?: string }) => void;
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
                  disabled={currentStep === 0}
                  onPress={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  style={{ flex: 1, marginRight: spacing.sm }}
                >
                  <Text style={styles.linkText}>Back</Text>
                </Button>
                <Button
                  variant={isFinalStep ? 'ai' : 'default'}
                  style={{ flex: 1 }}
                  disabled={nextDisabled}
                  onPress={handleSubmit}
                >
                  {isFinalStep && <Icon name="arcs" size={18} color={colors.canvas} />}
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
                    <Button variant="accent" onPress={() => onAdopt(suggestion)}>
                      <Text style={styles.buttonText}>Adopt Goal</Text>
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

function EditArcModal({
  visible,
  onClose,
  initialName,
  initialNorthStar,
  initialNarrative,
  onSubmit,
  insetTop,
}: EditArcModalProps) {
  const [name, setName] = useState(initialName);
  const [northStar, setNorthStar] = useState(initialNorthStar ?? '');
  const [narrative, setNarrative] = useState(initialNarrative ?? '');

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setNorthStar(initialNorthStar ?? '');
      setNarrative(initialNarrative ?? '');
    }
  }, [visible, initialName, initialNorthStar, initialNarrative]);

  const disabled = name.trim().length === 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.xl + insetTop }]}>
          <Heading style={styles.modalTitle}>Edit Arc</Heading>
          <Text style={styles.modalBody}>
            Update the arc details to keep this direction aligned with your season.
          </Text>
          <Text style={styles.modalLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Arc name"
            placeholderTextColor="#6B7280"
          />
          <Text style={styles.modalLabel}>North star</Text>
          <TextInput
            style={styles.input}
            value={northStar}
            onChangeText={setNorthStar}
            placeholder="North star"
            placeholderTextColor="#6B7280"
          />
          <Text style={styles.modalLabel}>Narrative</Text>
          <TextInput
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
            multiline
            value={narrative}
            onChangeText={setNarrative}
            placeholder="Narrative"
            placeholderTextColor="#6B7280"
          />
          <HStack space="sm" marginTop={spacing.lg}>
            <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
              <Text style={styles.linkText}>Cancel</Text>
            </Button>
            <Button
              style={{ flex: 1 }}
              disabled={disabled}
              onPress={() => onSubmit({ name, northStar, narrative })}
            >
              <Text style={styles.buttonText}>Save</Text>
            </Button>
          </HStack>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    width: 36,
    height: 36,
  },
  optionsButton: {
    borderRadius: 999,
    width: 36,
    height: 36,
  },
  goalCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcTitle: {
    ...typography.titleXl,
    color: colors.textPrimary,
  },
  arcTitleInput: {
    ...typography.titleXl,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  northStar: {
    ...typography.body,
    color: colors.textPrimary,
  },
  northStarInput: {
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  arcNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcNarrativeInput: {
    ...typography.bodySm,
    color: colors.textSecondary,
    padding: 0,
    margin: 0,
  },
  editableField: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editableFieldActive: {
    borderColor: colors.accent,
  },
  inlineEditOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  optionsMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  optionsMenuContainer: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: spacing['2xl'],
    paddingRight: spacing.lg,
  },
  optionsMenu: {
    backgroundColor: colors.canvas,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    minWidth: 160,
    // soft shadow similar to shadcn popover / dropdown
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  optionsMenuItem: {
    paddingVertical: spacing.sm,
  },
  optionsMenuItemDestructiveText: {
    ...typography.bodySm,
    color: colors.warning,
  },
  optionsMenuLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
    marginBottom: spacing.xs,
  },
  optionsMenuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
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
    ...cardSurfaceStyle,
    padding: spacing.lg,
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
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  forceIntentRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  intentChip: {
    ...typography.bodySm,
    color: colors.textSecondary,
    backgroundColor: colors.cardMuted,
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
  recommendationsEntryButton: {
    marginTop: spacing.sm,
  },
  recommendationsEntryText: {
    ...typography.body,
    color: colors.canvas,
    textAlign: 'center',
  },
  recommendationsModalContent: {
    backgroundColor: colors.canvas,
    borderRadius: 32,
    padding: spacing.xl,
    height: '95%',
  },
  recommendationsOverlay: {
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  recommendationsCloseButton: {
    borderRadius: 999,
    width: 32,
    height: 32,
  },
});

