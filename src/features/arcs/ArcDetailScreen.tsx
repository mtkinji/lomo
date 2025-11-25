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
  StyleProp,
  ViewStyle,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography, fonts } from '../../theme';
import { defaultForceLevels, useAppStore } from '../../store/useAppStore';
import { GoalDraft, type ThumbnailStyle } from '../../domain/types';
import { generateGoals } from '../../services/ai';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Sheet, VStack, Heading, HStack } from '../../ui/primitives';
import { Text as UiText } from '@/components/ui/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { GoalListCard } from '../../ui/GoalListCard';
import { BottomDrawer } from '../../ui/BottomDrawer';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  DEFAULT_THUMBNAIL_STYLE,
  type ArcGradientDirection,
  getArcGradient,
  getArcMosaicCell,
  getArcTopoSizes,
  pickThumbnailStyle,
  buildArcThumbnailSeed,
} from './thumbnailVisuals';
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
  const insets = useSafeAreaInsets();

  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const removeArc = useAppStore((state) => state.removeArc);
  const updateArc = useAppStore((state) => state.updateArc);

  const arc = useMemo(() => arcs.find((item) => item.id === arcId), [arcs, arcId]);
  const arcGoals = useMemo(() => goals.filter((goal) => goal.arcId === arcId), [goals, arcId]);
  const activityCountByGoal = useMemo(
    () =>
      activities.reduce<Record<string, number>>((acc, activity) => {
        if (!activity.goalId) return acc;
        acc[activity.goalId] = (acc[activity.goalId] ?? 0) + 1;
        return acc;
      }, {}),
    [activities],
  );
  const thumbnailStyles = useMemo<ThumbnailStyle[]>(() => {
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return ['topographyDots'];
  }, [visuals]);
  const [isNarrativeEditorVisible, setIsNarrativeEditorVisible] = useState(false);
  const [isNewGoalModalVisible, setIsNewGoalModalVisible] = useState(false);

  if (!arc) {
    return (
      <AppShell>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.emptyBody}>Arc not found.</Text>
        </View>
      </AppShell>
    );
  }

  const heroSeed = useMemo(
    () => buildArcThumbnailSeed(arc.id, arc.name, arc.thumbnailVariant),
    [arc.id, arc.name, arc.thumbnailVariant],
  );

  const { colors: headerGradientColors, direction: headerGradientDirection } = useMemo(
    () => getArcGradient(heroSeed),
    [heroSeed],
  );

  const handleDeleteArc = useCallback(() => {
    Alert.alert(
      'Delete arc?',
      'This will remove the arc and related goals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeArc(arc.id);
            navigation.goBack();
          },
        },
      ],
    );
  }, [arc.id, navigation, removeArc]);

  return (
    <AppShell backgroundVariant="arcGradient">
      <View style={styles.screen}>
        <View style={styles.paddedSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.headerSide}>
              <IconButton
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Back to Arcs"
              >
                <Icon name="arrowLeft" size={20} color={colors.canvas} strokeWidth={2.5} />
              </IconButton>
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.objectTypeRow}>
                <Icon name="arcs" size={18} color={colors.textSecondary} />
                <Text style={styles.objectTypeLabel}>Arc</Text>
              </View>
            </View>
            <View style={styles.headerSideRight}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton style={styles.optionsButton} accessibilityLabel="Arc actions">
                    <Icon name="more" size={18} color={colors.canvas} />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                  {/* Primary, non-destructive action(s) first */}
                  <DropdownMenuItem
                    onPress={() => {
                      // TODO: wire up real archive behavior once the store exposes it.
                      Alert.alert(
                        'Archive arc',
                        'Archiving is not yet implemented. This will be wired to an archive action in the store.'
                      );
                    }}
                  >
                    <View style={styles.menuItemRow}>
                      <Icon name="info" size={16} color={colors.textSecondary} />
                      <Text style={styles.menuItemLabel}>Archive</Text>
                    </View>
                  </DropdownMenuItem>

                  {/* Divider before destructive actions */}
                  <DropdownMenuSeparator />

                  {/* Destructive action pinned to the bottom */}
                  <DropdownMenuItem onPress={handleDeleteArc} variant="destructive">
                    <View style={styles.menuItemRow}>
                      <Icon name="trash" size={16} color={colors.destructive} />
                      <Text style={styles.destructiveMenuRowText}>Delete arc</Text>
                    </View>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageContent}>
            <View>
              <View style={[styles.paddedSection, styles.arcHeaderSection]}>
                <View style={styles.heroContainer}>
                  <View style={styles.heroImageWrapper}>
                    {arc.thumbnailUrl ? (
                      <Image
                        source={{ uri: arc.thumbnailUrl }}
                        style={styles.heroImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={headerGradientColors}
                        start={headerGradientDirection.start}
                        end={headerGradientDirection.end}
                        style={styles.heroImage}
                      />
                    )}
                  </View>
                </View>

                <Text style={styles.arcTitle}>{arc.name}</Text>
                {arc.narrative ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsNarrativeEditorVisible(true)}
                  >
                    <Text style={[styles.arcNarrative, { marginTop: spacing.sm }]}>
                      {arc.narrative}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsNarrativeEditorVisible(true)}
                    style={{ marginTop: spacing.sm }}
                  >
                    <Text style={styles.arcNarrativePlaceholder}>
                      Add a short note about this Arc…
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sectionDivider} />
            </View>

            <View style={styles.goalsSection}>
              <View
                style={[
                  styles.goalsDrawerInner,
                  { paddingBottom: spacing['2xl'] + insets.bottom },
                ]}
              >
                <View style={[styles.goalsDrawerHeaderRow, styles.goalsDrawerHeaderRowRaised]}>
                  <Text style={styles.sectionTitle}>
                    Goals <Text style={styles.goalCount}>({arcGoals.length})</Text>
                  </Text>
                  <IconButton
                    style={styles.goalsExpandButton}
                    onPress={() => setIsNewGoalModalVisible(true)}
                    accessibilityLabel="Create a new goal"
                  >
                    <Icon name="plus" size={18} color={colors.canvas} />
                  </IconButton>
                </View>

                {arcGoals.length === 0 ? (
                  <Text style={[styles.emptyBody, styles.goalsEmptyState]}>
                    No goals yet for this Arc.
                  </Text>
                ) : (
                  <View style={styles.goalsScrollContent}>
                    <View style={{ gap: spacing.sm }}>
                      {arcGoals.map((goal) => (
                        <GoalListCard
                          key={goal.id}
                          goal={goal}
                          parentArc={arc}
                          activityCount={activityCountByGoal[goal.id] ?? 0}
                          thumbnailStyles={thumbnailStyles}
                          onPress={() =>
                            navigation.navigate('GoalDetail', {
                              goalId: goal.id,
                              entryPoint: 'arcsStack',
                            })
                          }
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      <NewGoalModal
        visible={isNewGoalModalVisible}
        onClose={() => setIsNewGoalModalVisible(false)}
        arcName={arc.name}
        arcNarrative={arc.narrative}
        onAdopt={(goal) => {
          // For now, just close the modal after adopting; the detailed Goal
          // creation plumbing can be wired separately.
          setIsNewGoalModalVisible(false);
        }}
      />
      <ArcNarrativeEditorSheet
        visible={isNarrativeEditorVisible}
        onClose={() => setIsNarrativeEditorVisible(false)}
        arcName={arc.name}
        narrative={arc.narrative}
        onSave={(nextNarrative) => {
          const trimmed = nextNarrative.trim();
          updateArc(arc.id, (current) => ({
            ...current,
            narrative: trimmed.length === 0 ? undefined : trimmed,
            updatedAt: new Date().toISOString(),
          }));
          setIsNarrativeEditorVisible(false);
        }}
      />
    </AppShell>
  );
}

type NewGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  arcNarrative?: string;
  onAdopt: (goal: GoalDraft) => void;
};

type HeroImageModalProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  heroSeed: string;
  hasHero: boolean;
  loading: boolean;
  error: string;
  thumbnailUrl?: string;
  heroGradientColors: string[];
  heroGradientDirection: ArcGradientDirection;
  heroTopoSizes: number[];
  showTopography: boolean;
  showGeoMosaic: boolean;
  onGenerate: () => void;
  onUpload: () => void;
  onRemove: () => void;
};

type ArcNarrativeEditorSheetProps = {
  visible: boolean;
  onClose: () => void;
  arcName: string;
  narrative?: string;
  onSave: (nextNarrative: string) => void;
};

function NewGoalModal({
  visible,
  onClose,
  arcName,
  arcNarrative,
  onAdopt,
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
    <Sheet visible={visible} onClose={onClose} snapPoints={['80%']}>
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
    </Sheet>
  );
}

function HeroImageModal({
  visible,
  onClose,
  heroSeed,
  hasHero,
  loading,
  error,
  thumbnailUrl,
  heroGradientColors,
  heroGradientDirection,
  heroTopoSizes,
  showTopography,
  showGeoMosaic,
  onGenerate,
  onUpload,
  onRemove,
}: HeroImageModalProps) {
  const shouldShowTopography = showTopography && !thumbnailUrl;
  const shouldShowGeoMosaic = showGeoMosaic && !thumbnailUrl;
  const showRefreshAction = !thumbnailUrl;

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={['90%']}>
      <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
        <Heading style={styles.modalTitle}>Arc Thumbnail</Heading>
        <View style={styles.heroModalPreviewSection}>
          <View style={styles.heroModalPreviewColumn}>
            <View style={styles.heroModalPreviewFrame}>
              <View style={styles.heroModalPreviewInner}>
                {thumbnailUrl ? (
                  <Image
                    source={{ uri: thumbnailUrl }}
                    style={styles.heroModalPreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={heroGradientColors}
                    start={heroGradientDirection.start}
                    end={heroGradientDirection.end}
                    style={styles.heroModalPreviewImage}
                  />
                )}
                {shouldShowTopography && (
                  <View style={styles.arcHeroTopoLayer}>
                    <View style={styles.arcHeroTopoGrid}>
                      {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, rowIndex) => (
                        <View
                          // eslint-disable-next-line react/no-array-index-key
                          key={`hero-modal-topo-row-${rowIndex}`}
                          style={styles.arcHeroTopoRow}
                        >
                          {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, colIndex) => {
                            const cellIndex = rowIndex * ARC_TOPO_GRID_SIZE + colIndex;
                            const rawSize = heroTopoSizes[cellIndex] ?? 0;
                            const isHidden = rawSize < 0;
                            const dotSize = isHidden ? 0 : rawSize;
                            return (
                              // eslint-disable-next-line react/no-array-index-key
                              <View
                                key={`hero-modal-topo-cell-${rowIndex}-${colIndex}`}
                                style={[
                                  styles.arcHeroTopoDot,
                                  (dotSize === 0 || isHidden) && styles.arcHeroTopoDotSmall,
                                  dotSize === 1 && styles.arcHeroTopoDotMedium,
                                  dotSize === 2 && styles.arcHeroTopoDotLarge,
                                  isHidden && styles.arcHeroTopoDotHidden,
                                ]}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {shouldShowGeoMosaic && (
                  <View style={styles.arcHeroMosaicLayer}>
                    {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                      <View
                        // eslint-disable-next-line react/no-array-index-key
                        key={`hero-modal-mosaic-row-${rowIndex}`}
                        style={styles.arcHeroMosaicRow}
                      >
                        {Array.from({ length: ARC_MOSAIC_COLS }).map((_, colIndex) => {
                          const cell = getArcMosaicCell(heroSeed, rowIndex, colIndex);
                          if (cell.shape === 0) {
                            return (
                              // eslint-disable-next-line react/no-array-index-key
                              <View
                                key={`hero-modal-mosaic-cell-${rowIndex}-${colIndex}`}
                                style={styles.arcHeroMosaicCell}
                              />
                            );
                          }

                          let shapeStyle: StyleProp<ViewStyle> = styles.arcHeroMosaicCircle;
                          if (cell.shape === 2) {
                            shapeStyle = styles.arcHeroMosaicPillVertical;
                          } else if (cell.shape === 3) {
                            shapeStyle = styles.arcHeroMosaicPillHorizontal;
                          }

                          return (
                            // eslint-disable-next-line react/no-array-index-key
                            <View
                              key={`hero-modal-mosaic-cell-${rowIndex}-${colIndex}`}
                              style={styles.arcHeroMosaicCell}
                            >
                              <View
                                style={[
                                  styles.arcHeroMosaicShapeBase,
                                  shapeStyle,
                                  { backgroundColor: cell.color },
                                ]}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.heroModalControls}>
            <View style={styles.heroModalActionRow}>
              <View style={styles.heroModalAction}>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!showRefreshAction || loading}
                  onPress={onGenerate}
                  style={styles.heroModalActionButton}
                  accessibilityLabel="Refresh thumbnail"
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Icon
                      name="refresh"
                      size={20}
                      color={showRefreshAction ? colors.textPrimary : colors.textSecondary}
                    />
                  )}
                </Button>
                <Text
                  style={[
                    styles.heroModalActionLabel,
                    !showRefreshAction && { color: colors.textSecondary },
                  ]}
                >
                  Refresh
                </Text>
              </View>
              <View style={styles.heroModalAction}>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!hasHero || loading}
                  onPress={onRemove}
                  style={styles.heroModalActionButton}
                  accessibilityLabel="Remove image"
                >
                  <Icon
                    name="trash"
                    size={20}
                    color={colors.textSecondary}
                    style={{ opacity: hasHero ? 1 : 0.4 }}
                  />
                </Button>
                <Text
                  style={[
                    styles.heroModalActionLabel,
                    !hasHero && { color: colors.textSecondary, opacity: 0.5 },
                  ]}
                >
                  Remove
                </Text>
              </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.heroModalUploadContainer}>
              <Button
                variant="outline"
                disabled={loading}
                onPress={onUpload}
                style={styles.heroModalUpload}
              >
                <Icon name="image" size={18} color={colors.textPrimary} />
                <Text style={styles.buttonTextAlt}>Upload</Text>
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Sheet>
  );
}

function ArcNarrativeEditorSheet({
  visible,
  onClose,
  arcName,
  narrative,
  onSave,
}: ArcNarrativeEditorSheetProps) {
  const [draft, setDraft] = useState(narrative ?? '');

  useEffect(() => {
    setDraft(narrative ?? '');
  }, [narrative]);

  if (!visible) {
    return null;
  }

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <BottomDrawer visible={visible} onClose={onClose} heightRatio={0.9}>
      <View style={styles.narrativeSheetContent}>
        <View style={styles.narrativeSheetHeaderRow}>
          <View style={styles.narrativeSheetHeaderSide}>
            <Button
              variant="ghost"
              onPress={onClose}
              style={styles.narrativeSheetHeaderButton}
            >
              <Text style={styles.narrativeSheetHeaderLinkText}>Cancel</Text>
            </Button>
          </View>
          <View style={styles.narrativeSheetHeaderCenter}>
            <Text style={styles.narrativeSheetTitle}>Arc note</Text>
            <Text style={styles.narrativeSheetSubtitle} numberOfLines={1}>
              {arcName}
            </Text>
          </View>
          <View style={styles.narrativeSheetHeaderSideRight}>
            <Button
              variant="ghost"
              onPress={handleSave}
              style={styles.narrativeSheetHeaderButton}
            >
              <Text style={styles.narrativeSheetHeaderPrimaryText}>Done</Text>
            </Button>
          </View>
        </View>

        <View style={styles.narrativeRichToolbar}>
          <View style={styles.narrativeRichToolbarModePill}>
            <Text style={styles.narrativeRichToolbarModeText}>Body</Text>
          </View>
          <View style={styles.narrativeRichToolbarSpacer} />
          <View style={styles.narrativeRichToolbarGroup}>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>B</Text>
            </View>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>I</Text>
            </View>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>U</Text>
            </View>
            <View style={styles.narrativeRichToolbarButton}>
              <Text style={styles.narrativeRichToolbarButtonText}>•</Text>
            </View>
          </View>
        </View>

        <View style={styles.narrativeSheetEditorContainer}>
          <TextInput
            style={styles.narrativeSheetTextInput}
            multiline
            textAlignVertical="top"
            placeholder="Describe this Arc in your own words. What season are you in? What kind of work keeps you grounded here?"
            placeholderTextColor={colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            autoFocus
          />
        </View>
      </View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
    flexGrow: 1,
  },
  pageContent: {
    flex: 1,
  },
  headerSide: {
    flex: 1,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSideRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  goalsDrawerInner: {
    paddingHorizontal: 0,
    // paddingTop: spacing.xs,
    paddingBottom: spacing['2xl'],
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
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  heroImageWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  heroImage: {
    width: '100%',
    // Match the Arc list card hero: a wide banner that still leaves room
    // for content below.
    aspectRatio: 3 / 1,
  },
  buttonTextAlt: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  heroModalPreviewSection: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  heroModalPreviewColumn: {
    flexBasis: '50%',
    flexGrow: 1,
    minWidth: 220,
  },
  heroModalPreviewFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  heroModalPreviewInner: {
    flex: 1,
  },
  heroModalPreviewImage: {
    width: '100%',
    height: '100%',
  },
  heroModalControls: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 220,
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroModalActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  heroModalAction: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroModalActionButton: {
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroModalActionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  heroModalSupportText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heroModalUploadContainer: {
    width: '100%',
  },
  heroModalUpload: {
    width: '100%',
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
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
  },
  arcThumbnailInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  arcThumbnail: {
    width: '100%',
    height: '100%',
  },
  arcHeroTopoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcHeroTopoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  arcHeroTopoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcHeroTopoDot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  arcHeroTopoDotSmall: {
    width: 4,
    height: 4,
  },
  arcHeroTopoDotMedium: {
    width: 7,
    height: 7,
  },
  arcHeroTopoDotLarge: {
    width: 10,
    height: 10,
  },
  arcHeroTopoDotHidden: {
    opacity: 0,
  },
  arcHeroMosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  arcHeroMosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcHeroMosaicCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcHeroMosaicShapeBase: {
    borderRadius: 999,
  },
  arcHeroMosaicCircle: {
    width: '70%',
    height: '70%',
  },
  arcHeroMosaicPillVertical: {
    width: '55%',
    height: '100%',
  },
  arcHeroMosaicPillHorizontal: {
    width: '100%',
    height: '55%',
  },
  arcHeroInitial: {
    ...typography.titleSm,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 24,
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
    // Primary Arc title – slightly larger than list card titles for hierarchy
    ...typography.titleSm,
    fontFamily: fonts.extrabold,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
  arcTitleInput: {
    // Match the display title sizing so inline edits feel 1:1
    ...typography.titleSm,
    fontFamily: fonts.extrabold,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 28,
    padding: 0,
    margin: 0,
  },
  arcNarrative: {
    // Arc description – bump to the base body size for better readability
    ...typography.body,
    color: colors.textPrimary,
  },
  arcNarrativePlaceholder: {
    ...typography.body,
    color: colors.textSecondary,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  arcNarrativeInput: {
    // Keep edit state consistent with the display narrative
    ...typography.body,
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
  objectTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  objectTypeLabel: {
    // Centered object type label (e.g. "Arc") that visually balances between
    // the back and overflow buttons in the header, without forcing uppercase.
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  goalsDrawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalsDrawerHeaderRowRaised: {
    paddingBottom: spacing.sm,
  },
  goalsExpandButton: {
    alignSelf: 'flex-end',
    marginTop: 0,
  },
  goalsSection: {
    marginTop: 0,
  },
  sectionDivider: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    // Use a full-width, pill-shaped rule so the section break is legible
    // against the light shell background while still feeling airy.
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
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
  goalsScroll: {
    marginTop: spacing.md,
  },
  goalsScrollContent: {
    paddingBottom: spacing.lg,
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
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
    width: '100%',
  },
  menuItemLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  destructiveMenuRowText: {
    ...typography.bodySm,
    color: colors.destructive,
    fontFamily: fonts.medium,
  },
  narrativeSheetContent: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  narrativeSheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  narrativeSheetHeaderSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  narrativeSheetHeaderSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  narrativeSheetHeaderCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  narrativeSheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  narrativeSheetSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  narrativeSheetHeaderButton: {
    minHeight: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  narrativeSheetHeaderLinkText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  narrativeSheetHeaderPrimaryText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.medium,
  },
  narrativeRichToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    marginBottom: spacing.md,
  },
  narrativeRichToolbarModePill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.canvas,
  },
  narrativeRichToolbarModeText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  narrativeRichToolbarSpacer: {
    flex: 1,
  },
  narrativeRichToolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  narrativeRichToolbarButton: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.canvas,
  },
  narrativeRichToolbarButtonText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  narrativeSheetEditorContainer: {
    flex: 1,
    marginTop: spacing.sm,
  },
  narrativeSheetTextInput: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.canvas,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
});

