import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Share,
} from 'react-native';
import { VStack, Heading, Text, HStack } from '@gluestack-ui/themed';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography, fonts } from '../../theme';
import { defaultForceLevels, useAppStore } from '../../store/useAppStore';
import { GoalDraft } from '../../domain/types';
import { generateGoals, generateArcHeroImage } from '../../services/ai';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { LomoBottomSheet } from '../../ui/BottomSheet';
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

// Slightly richer, higher-chroma palettes for Arc thumbnails and heroes.
// Still stay in the brand's soft, spiritual range but feel more "alive".
const ARC_HERO_PALETTES: [string, string][] = [
  ['#DCFCE7', '#86EFAC'], // fresh pine → mint
  ['#E0F2FE', '#7DD3FC'], // sky → bright sky
  ['#FEF3C7', '#FACC15'], // warm amber
  ['#FCE7F3', '#F472B6'], // rosy
  ['#EDE9FE', '#A855F7'], // violet
  ['#F1F5F9', '#CBD5F5'], // soft neutral with a cool lift
];

const hashStringToIndex = (value: string, modulo: number): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const normalized = Math.abs(hash);
  return modulo === 0 ? 0 : normalized % modulo;
};

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
  const [recommendationsModalVisible, setRecommendationsModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'narrative' | null>(null);
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNarrative, setEditNarrative] = useState('');
  const [heroEditorVisible, setHeroEditorVisible] = useState(false);
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroError, setHeroError] = useState('');
  const insets = useSafeAreaInsets();

  const handleShareArc = useCallback(async () => {
    if (!arc) return;

    const sections: string[] = [];
    sections.push(arc.name);
    if (arc.narrative) {
      sections.push(`Narrative: ${arc.narrative}`);
    }

    const message = sections.join('\n\n');

    try {
      logArcDetailDebug('share:open', { arcId: arc.id, arcName: arc.name });
      await Share.share({
        title: arc.name,
        message,
      });
      logArcDetailDebug('share:completed', { arcId: arc.id, arcName: arc.name });
    } catch (err) {
      logArcDetailDebug('share:error', {
        arcId: arc.id,
        arcName: arc.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [arc]);

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

  const [heroStartColor, heroEndColor] = useMemo(
    () =>
      ARC_HERO_PALETTES[
        hashStringToIndex(arc.id || arc.name, ARC_HERO_PALETTES.length)
      ],
    [arc.id, arc.name]
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
  }, [arc, editingField, editName, editNarrative, updateArc]);

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

  const beginInlineEdit = useCallback(
    (field: 'name' | 'narrative') => {
      if (!arc) return;
      // If another field is currently editing, first commit that change.
      if (editingField && editingField !== field) {
        commitInlineEdit();
        return;
      }

      setEditingField(field);
      if (field === 'name') {
        setEditName(arc.name);
      } else if (field === 'narrative') {
        setEditNarrative(arc.narrative ?? '');
      }
    },
    [arc, editingField, commitInlineEdit]
  );

  const handleGenerateHeroImage = useCallback(async () => {
    if (!arc) return;
    const startedAt = Date.now();
    logArcDetailDebug('hero:generate:start', { arcId: arc.id, arcName: arc.name });
    setHeroLoading(true);
    setHeroError('');
    try {
      const url = await generateArcHeroImage({
        arcName: arc.name,
        arcNarrative: arc.narrative,
      });
      const timestamp = new Date().toISOString();
      const promptSummary = [arc.name, arc.narrative].filter(Boolean).join(' – ');
      updateArc(arc.id, (prev) => ({
        ...prev,
        thumbnailUrl: url,
        heroImageMeta: {
          source: 'ai',
          prompt: promptSummary,
          createdAt: timestamp,
        },
        updatedAt: timestamp,
      }));
      logArcDetailDebug('hero:generate:success', {
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      console.error('Hero image generation failed', err);
      logArcDetailDebug('hero:generate:error', {
        durationMs: Date.now() - startedAt,
        message: err instanceof Error ? err.message : String(err),
      });
      setHeroError('Something went wrong asking LOMO for an image. Try again.');
    } finally {
      setHeroLoading(false);
    }
  }, [arc, updateArc]);

  const handlePickHeroImage = useCallback(async () => {
    if (!arc) return;
    try {
      setHeroError('');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        return;
      }
      const timestamp = new Date().toISOString();
      updateArc(arc.id, (prev) => ({
        ...prev,
        thumbnailUrl: asset.uri,
        heroImageMeta: {
          source: 'upload',
          createdAt: timestamp,
        },
        updatedAt: timestamp,
      }));
    } catch (err) {
      console.error('Hero image picker failed', err);
      setHeroError('Unable to pick an image right now.');
    }
  }, [arc, updateArc]);

  const handleRemoveHeroImage = useCallback(() => {
    if (!arc) return;
    const timestamp = new Date().toISOString();
    updateArc(arc.id, (prev) => {
      const { heroImageMeta: _hero, ...rest } = prev;
      return {
        ...rest,
        thumbnailUrl: undefined,
        updatedAt: timestamp,
      };
    });
    setHeroError('');
  }, [arc, updateArc]);

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

  const hasGoals = arcGoals.length > 0;
  const hasRecommendations = recommendations.length > 0;

  return (
    <AppShell>
      {editingField && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.inlineEditOverlay}
          onPress={commitInlineEdit}
        />
      )}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.paddedSection}>
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
        </View>
        <View style={[styles.paddedSection, styles.arcHeaderSection]}>
          <HStack alignItems="flex-start" space="md">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setHeroEditorVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Edit arc image"
            >
              <View style={styles.arcThumbnailWrapper}>
                {arc.thumbnailUrl ? (
                  <Image
                    source={{ uri: arc.thumbnailUrl }}
                    style={styles.arcThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[heroStartColor, heroEndColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.arcThumbnail}
                  />
                )}
              </View>
            </TouchableOpacity>
            <VStack space="xs" flex={1}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => beginInlineEdit('name')}
                style={[
                  styles.editableField,
                  styles.arcNameEditableField,
                  editingField === 'name' && styles.editableFieldActive,
                ]}
              >
                {editingField === 'name' ? (
                  <TextInput
                    style={styles.arcTitleInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Arc name"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="done"
                    onSubmitEditing={commitInlineEdit}
                    autoFocus
                  />
                ) : (
                  <Heading style={styles.arcTitle}>{arc.name}</Heading>
                )}
              </TouchableOpacity>
              {arc.heroImageMeta && (
                <Text style={styles.heroMetaText}>
                  {arc.heroImageMeta.source === 'ai' ? 'Generated by LOMO' : 'Uploaded image'}
                </Text>
              )}
            </VStack>
          </HStack>
        </View>
        <View style={styles.paddedSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => beginInlineEdit('narrative')}
            style={[
              styles.editableField,
              editingField === 'narrative' && styles.editableFieldActive,
            ]}
          >
            {editingField === 'narrative' ? (
              <TextInput
                style={styles.arcNarrativeInput}
                value={editNarrative}
                onChangeText={setEditNarrative}
                placeholder="Tap to add a narrative for this Arc"
                placeholderTextColor={colors.textSecondary}
                multiline
                onBlur={commitInlineEdit}
              />
            ) : (
              <Text style={styles.arcNarrative}>
                {arc.narrative || 'Tap to add a narrative for this Arc.'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={[styles.paddedSection, styles.goalsSection]}>
          <VStack space="md">
            <HStack justifyContent="space-between" alignItems="center">
              <Heading style={styles.sectionTitle}>
                Goals <Text style={styles.goalCount}>({arcGoals.length})</Text>
              </Heading>
              <Button
                variant="secondary"
                size="small"
                style={styles.sectionActionButton}
                onPress={() => setGoalModalVisible(true)}
              >
                <Text style={styles.sectionActionText}>New Goal</Text>
              </Button>
            </HStack>

            {!hasGoals && (
              <VStack space="md" style={styles.goalsEmptyState}>
                <View style={styles.goalsEmptyImageWrapper}>
                  <LinearGradient
                    colors={['#E0F2FE', '#F5F3FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.goalsEmptyImage}
                  />
                  <Icon name="goals" size={32} color={colors.textSecondary} />
                </View>
                <Heading style={styles.sectionTitle}>No goals yet for this Arc</Heading>
                <Text style={styles.emptyBody}>
                  Start with a few gentle recommendations from LOMO. You can adopt them as-is or
                  tweak them to fit your season.
                </Text>
                {hasRecommendations && (
                  <Button
                    variant="ai"
                    style={styles.recommendationsEntryButton}
                    onPress={() => setRecommendationsModalVisible(true)}
                  >
                    <Icon name="arcs" size={16} color={colors.canvas} />
                    <Text style={styles.recommendationsEntryText}>
                      View {recommendations.length} recommended goal
                      {recommendations.length > 1 ? 's' : ''}
                    </Text>
                  </Button>
                )}
              </VStack>
            )}

            {hasGoals && (
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
        </View>
      </ScrollView>
      <NewGoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        arcName={arc.name}
        arcNarrative={arc.narrative}
        onAdopt={handleAdoptGoal}
        insetTop={insets.top}
      />
      <HeroImageModal
        visible={heroEditorVisible}
        onClose={() => setHeroEditorVisible(false)}
        arcName={arc.name}
        hasHero={Boolean(arc.thumbnailUrl)}
        loading={heroLoading}
        error={heroError}
        onGenerate={handleGenerateHeroImage}
        onUpload={handlePickHeroImage}
        onRemove={handleRemoveHeroImage}
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
                  handleShareArc();
                }}
              >
                <Text style={styles.optionsMenuItemText}>Share arc</Text>
              </TouchableOpacity>
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
      <LomoBottomSheet
        visible={recommendationsModalVisible}
        onClose={() => setRecommendationsModalVisible(false)}
        snapPoints={['80%']}
      >
        <View style={[styles.recommendationsModalContent, { paddingTop: spacing.lg }]}>
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
      </LomoBottomSheet>
    </AppShell>
  );
}

type NewGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  arcNarrative?: string;
  onAdopt: (goal: GoalDraft) => void;
  insetTop: number;
};

type HeroImageModalProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  hasHero: boolean;
  loading: boolean;
  error: string;
  onGenerate: () => void;
  onUpload: () => void;
  onRemove: () => void;
};

function NewGoalModal({
  visible,
  onClose,
  arcName,
  arcNarrative,
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
    <LomoBottomSheet visible={visible} onClose={onClose} snapPoints={['80%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
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
    </LomoBottomSheet>
  );
}

function HeroImageModal({
  visible,
  onClose,
  arcName,
  hasHero,
  loading,
  error,
  onGenerate,
  onUpload,
  onRemove,
}: HeroImageModalProps) {
  return (
    <LomoBottomSheet visible={visible} onClose={onClose} snapPoints={['45%']}>
      <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
        <Heading style={styles.modalTitle}>Arc image</Heading>
        <Text style={styles.modalBody}>
          Give this Arc a hero image that captures its feel. You can ask LOMO to generate one or
          upload your own.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <VStack space="sm" style={{ marginTop: spacing.sm }}>
          <Button variant="ai" disabled={loading} onPress={onGenerate}>
            {loading ? (
              <HStack alignItems="center" space="sm">
                <ActivityIndicator color="#38BDF8" />
                <Text style={styles.buttonText}>Asking LOMO…</Text>
              </HStack>
            ) : (
              <>
                <Icon name="arcs" size={18} color={colors.canvas} />
                <Text style={styles.buttonText}>Ask LOMO for an image</Text>
              </>
            )}
          </Button>
          <Button variant="secondary" disabled={loading} onPress={onUpload}>
            <Text style={styles.linkText}>Upload from library</Text>
          </Button>
          {hasHero && (
            <Button
              variant="outline"
              disabled={loading}
              onPress={onRemove}
              style={{ marginTop: spacing.xs }}
            >
              <Text style={styles.optionsMenuItemDestructiveText}>Remove image</Text>
            </Button>
          )}
        </VStack>
        <Button variant="link" onPress={onClose} style={{ marginTop: spacing.lg }}>
          <Text style={styles.linkText}>Close</Text>
        </Button>
      </View>
    </LomoBottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  paddedSection: {
    // Let the AppShell define the primary horizontal gutters so this screen
    // matches other canvases. We only add vertical spacing here.
    paddingHorizontal: 0,
  },
  arcHeaderSection: {
    marginTop: spacing.lg,
  },
  heroContainer: {
    marginTop: spacing.md,
  },
  heroImageWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  heroEditButton: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  heroMetaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginHorizontal: spacing.xl,
  },
  // Thumbnail used in the header row – smaller, card-like image.
  arcThumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  arcThumbnail: {
    width: '100%',
    height: '100%',
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
    ...typography.titleSm,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
  },
  arcTitleInput: {
    ...typography.titleSm,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
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
  // Remove top padding from the Arc name wrapper so the text baseline
  // aligns more closely with the top edge of the thumbnail.
  arcNameEditableField: {
    paddingTop: 0,
    // Hug the thumbnail closely on the left while preserving the
    // general editable field padding on the right.
    paddingLeft: 0,
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
  optionsMenuItemText: {
    ...typography.bodySm,
    color: colors.textPrimary,
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
  goalsSection: {
    // Give the Arc narrative more breathing room before the Goals section
    marginTop: spacing['2xl'],
  },
  sectionActionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    // Slightly stronger shadow so the chip reads clearly on shell background, similar to shadcn
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionActionText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
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
  goalsEmptyState: {
    marginTop: spacing.lg,
  },
  goalsEmptyImageWrapper: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.shellAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  goalsEmptyImage: {
    ...StyleSheet.absoluteFillObject,
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
    alignSelf: 'stretch',
  },
  recommendationsEntryText: {
    ...typography.bodySm,
    color: colors.canvas,
    textAlign: 'center',
    fontFamily: typography.titleSm.fontFamily,
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

