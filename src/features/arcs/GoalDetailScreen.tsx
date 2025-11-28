import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  StyleSheet,
  FlatList,
  View,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { cardSurfaceStyle, colors, spacing, typography, fonts } from '../../theme';
import { useAppStore, defaultForceLevels, getCanonicalForce } from '../../store/useAppStore';
import type { GoalDetailRouteParams } from '../../navigation/RootNavigator';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Dialog, VStack, Heading, Text, HStack } from '../../ui/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Arc, ForceLevel, ThumbnailStyle } from '../../domain/types';
import { TakadoBottomSheet } from '../../ui/BottomSheet';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  DEFAULT_THUMBNAIL_STYLE,
  getArcGradient,
  getArcMosaicCell,
  getArcTopoSizes,
  pickThumbnailStyle,
  buildArcThumbnailSeed,
} from './thumbnailVisuals';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { EditableField } from '../../ui/EditableField';
import { EditableTextArea } from '../../ui/EditableTextArea';
import { AgentFab } from '../../ui/AgentFab';
import { useAgentLauncher } from '../ai/useAgentLauncher';
import * as ImagePicker from 'expo-image-picker';

type GoalDetailRouteProp = RouteProp<{ GoalDetail: GoalDetailRouteParams }, 'GoalDetail'>;

const FORCE_ORDER: Array<string> = [
  'force-activity',
  'force-connection',
  'force-mastery',
  'force-spirituality',
];

export function GoalDetailScreen() {
  const route = useRoute<GoalDetailRouteProp>();
  const navigation = useNavigation();
  const { goalId, entryPoint } = route.params;

  const arcs = useAppStore((state) => state.arcs);
  const goals = useAppStore((state) => state.goals);
  const activities = useAppStore((state) => state.activities);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const hasSeenFirstGoalCelebration = useAppStore(
    (state) => state.hasSeenFirstGoalCelebration
  );
  const setHasSeenFirstGoalCelebration = useAppStore(
    (state) => state.setHasSeenFirstGoalCelebration
  );
  const removeGoal = useAppStore((state) => state.removeGoal);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const visuals = useAppStore((state) => state.userProfile?.visuals);
  const thumbnailStyles = useMemo<ThumbnailStyle[]>(() => {
    if (visuals?.thumbnailStyles && visuals.thumbnailStyles.length > 0) {
      return visuals.thumbnailStyles;
    }
    if (visuals?.thumbnailStyle) {
      return [visuals.thumbnailStyle];
    }
    return [DEFAULT_THUMBNAIL_STYLE];
  }, [visuals]);
  const [arcSelectorVisible, setArcSelectorVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingForces, setEditingForces] = useState(false);
  const [editForceIntent, setEditForceIntent] = useState<Record<string, ForceLevel>>(
    defaultForceLevels(0)
  );
  const [showFirstGoalCelebration, setShowFirstGoalCelebration] = useState(false);
  const insets = useSafeAreaInsets();

  const { openForScreenContext, openForFieldContext, AgentWorkspaceSheet } = useAgentLauncher();
  const [thumbnailSheetVisible, setThumbnailSheetVisible] = useState(false);

  const handleBack = () => {
    const nav: any = navigation;

    // Prefer stack back for a smooth, consistent slide transition whenever
    // possible (both from the Arcs stack and the Goals stack).
    if (nav && typeof nav.canGoBack === 'function' && nav.canGoBack()) {
      nav.goBack();
      return;
    }

    // Fallback: if something unexpected happens with the stack history, route
    // back to a safe top-level canvas based on the entry point hint.
    if (nav && typeof nav.getParent === 'function') {
      const parent = nav.getParent();
      if (parent && typeof parent.navigate === 'function') {
        if (entryPoint === 'arcsStack') {
          parent.navigate('ArcsStack', { screen: 'ArcsList' });
        } else {
          parent.navigate('Goals');
        }
        return;
      }
    }
    if (nav && typeof nav.navigate === 'function') {
      if (entryPoint === 'arcsStack') {
        nav.navigate('ArcsStack', { screen: 'ArcsList' });
      } else {
        nav.navigate('Goals');
      }
    }
  };

  const goal = useMemo(() => goals.find((g) => g.id === goalId), [goals, goalId]);
  const arc = useMemo(() => arcs.find((a) => a.id === goal?.arcId), [arcs, goal?.arcId]);
  const goalActivities = useMemo(
    () => activities.filter((activity) => activity.goalId === goalId),
    [activities, goalId]
  );

  const heroSeed = useMemo(
    () =>
      buildArcThumbnailSeed(goal?.id, goal?.title, goal?.thumbnailVariant),
    [goal?.id, goal?.title, goal?.thumbnailVariant]
  );
  const { colors: heroGradientColors, direction: heroGradientDirection } = useMemo(
    () => getArcGradient(heroSeed),
    [heroSeed]
  );
  const heroTopoSizes = useMemo(() => getArcTopoSizes(heroSeed), [heroSeed]);
  const thumbnailStyle = pickThumbnailStyle(heroSeed, thumbnailStyles);
  const showTopography = thumbnailStyle === 'topographyDots';
  const showGeoMosaic = thumbnailStyle === 'geoMosaic';
  const hasCustomThumbnail = Boolean(goal?.thumbnailUrl);
  const shouldShowTopography = showTopography && !hasCustomThumbnail;
  const shouldShowGeoMosaic = showGeoMosaic && !hasCustomThumbnail;

  if (!goal) {
    return (
      <AppShell>
        <VStack space="md">
          <Button
            size="icon"
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={20} color={colors.canvas} strokeWidth={2.5} />
          </Button>
          <Text style={styles.emptyBody}>Goal not found.</Text>
        </VStack>
      </AppShell>
    );
  }

  useEffect(() => {
    setEditForceIntent({ ...defaultForceLevels(0), ...goal.forceIntent });
  }, [goal]);

  useEffect(() => {
    if (
      goal &&
      lastOnboardingGoalId &&
      goal.id === lastOnboardingGoalId &&
      !hasSeenFirstGoalCelebration
    ) {
      setShowFirstGoalCelebration(true);
    }
  }, [goal, lastOnboardingGoalId, hasSeenFirstGoalCelebration]);

  const startDateLabel = goal.startDate
    ? new Date(goal.startDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const targetDateLabel = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const forceIntent = { ...defaultForceLevels(0), ...goal.forceIntent };
  const liveForceIntent = editingForces ? editForceIntent : forceIntent;

  const handleShuffleGoalThumbnail = useCallback(() => {
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      thumbnailUrl: prev.thumbnailUrl,
      thumbnailVariant: (prev.thumbnailVariant ?? 0) + 1,
      updatedAt: timestamp,
    }));
  }, [goal.id, updateGoal]);

  const handleUploadGoalThumbnail = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) return;

      const nowIso = new Date().toISOString();
      updateGoal(goal.id, (prev) => ({
        ...prev,
        thumbnailUrl: asset.uri,
        heroImageMeta: {
          source: 'upload',
          prompt: prev.heroImageMeta?.prompt,
          createdAt: nowIso,
        },
        updatedAt: nowIso,
      }));
    } catch {
      // Swallow picker errors for now; we can add surfaced feedback later.
    }
  }, [goal.id, updateGoal]);

  const handleDismissFirstGoalCelebration = () => {
    setShowFirstGoalCelebration(false);
    setHasSeenFirstGoalCelebration(true);
  };

  const handleDeleteGoal = () => {
    Alert.alert(
      'Delete goal?',
      'This will remove the goal and related activities.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeGoal(goal.id);
            handleBack();
          },
        },
      ],
    );
  };

  const handleUpdateArc = (nextArcId: string | null) => {
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      arcId: nextArcId ?? '',
      updatedAt: timestamp,
    }));
    setArcSelectorVisible(false);
  };

  const handleSaveGoal = (values: {
    title: string;
    description?: string;
    forceIntent: Record<string, ForceLevel>;
  }) => {
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      forceIntent: values.forceIntent,
      updatedAt: timestamp,
    }));
    setEditModalVisible(false);
  };

  const commitForceEdit = () => {
    if (!editingForces) return;
    const timestamp = new Date().toISOString();
    updateGoal(goal.id, (prev) => ({
      ...prev,
      forceIntent: editForceIntent,
      updatedAt: timestamp,
    }));
    setEditingForces(false);
  };

  const handleToggleForceEdit = () => {
    if (editingForces) {
      commitForceEdit();
      return;
    }
    // Enter edit mode with the latest store values
    setEditForceIntent({ ...defaultForceLevels(0), ...goal.forceIntent });
    setEditingForces(true);
  };

  const handleSetForceLevel = (forceId: string, level: ForceLevel) => {
    setEditForceIntent((prev) => ({
      ...prev,
      [forceId]: level,
    }));
  };

  const renderActivity = ({ item }: { item: (typeof activities)[number] }) => {
    const estimateHours =
      item.estimateMinutes != null ? Math.round((item.estimateMinutes ?? 0) / 60) : null;
    return (
      <VStack style={styles.activityCard} space="xs">
        <HStack justifyContent="space-between" alignItems="center">
          <Text style={styles.activityPhase}>{item.phase ?? 'Activity'}</Text>
          <Text style={styles.activityMeta}>
            {estimateHours != null ? `${estimateHours}h · ` : ''}
            {item.status.replace('_', ' ')}
          </Text>
        </HStack>
        <Text style={styles.activityTitle}>{item.title}</Text>
        {item.notes ? <Text style={styles.activityNotes}>{item.notes}</Text> : null}
      </VStack>
    );
  };

  return (
    <AppShell>
      <Dialog
        visible={showFirstGoalCelebration}
        onClose={handleDismissFirstGoalCelebration}
        title="You just set your first goal"
        description="This goal is your starting point in Takado. Next, add a couple of concrete Activities so you always know the very next step."
        footer={
          <HStack space="sm" marginTop={spacing.lg}>
            <Button style={{ flex: 1 }} onPress={handleDismissFirstGoalCelebration}>
              <Text style={styles.primaryCtaText}>Got it</Text>
            </Button>
          </HStack>
        }
      >
        <Text style={styles.firstGoalBadge}>🎉 First goal created</Text>
        <Text style={styles.firstGoalBody}>
          Use “Generate Activities with AI” for ideas, or “Add Activity manually” for something you
          already have in mind.
        </Text>
      </Dialog>
      {editingForces && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.forceEditOverlay}
          onPress={commitForceEdit}
        />
      )}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
      <VStack space="lg">
        <HStack alignItems="center">
          <View style={styles.headerSide}>
            <IconButton
              style={styles.backButton}
              onPress={handleBack}
              accessibilityLabel="Back to Arc"
            >
              <Icon name="arrowLeft" size={20} color={colors.canvas} strokeWidth={2.5} />
            </IconButton>
          </View>
          <View style={styles.headerCenter}>
            <HStack alignItems="center" justifyContent="center" space="xs">
              <Icon name="goals" size={16} color={colors.textSecondary} />
              <Text style={styles.objectTypeLabel}>Goal</Text>
            </HStack>
          </View>
          <View style={styles.headerSideRight}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton style={styles.optionsButton} accessibilityLabel="Goal actions">
                  <Icon name="more" size={18} color={colors.canvas} />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                {/* Primary, non-destructive actions first */}
                <DropdownMenuItem onPress={() => setEditModalVisible(true)}>
                  <View style={styles.menuItemRow}>
                    <Icon name="edit" size={16} color={colors.textSecondary} />
                    <Text style={styles.menuItemLabel}>Edit details</Text>
                  </View>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={() => {
                    Alert.alert(
                      'Archive goal',
                      'Archiving is not yet implemented. This will be wired to an archive action in the store.',
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

                <DropdownMenuItem onPress={handleDeleteGoal} variant="destructive">
                  <View style={styles.menuItemRow}>
                    <Icon name="trash" size={16} color={colors.destructive} />
                    <Text style={styles.destructiveMenuRowText}>Delete goal</Text>
                  </View>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        </HStack>

        <VStack space="sm">
          {/* Thumbnail + inline title editor */}
          <HStack alignItems="center" space="sm">
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.goalThumbnailWrapper}
              accessibilityRole="button"
              accessibilityLabel="Edit goal thumbnail"
              onPress={() => setThumbnailSheetVisible(true)}
            >
              <View style={styles.goalThumbnailInner}>
                {goal.thumbnailUrl ? (
                  <Image
                    source={{ uri: goal.thumbnailUrl }}
                    style={styles.goalThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={heroGradientColors}
                    start={heroGradientDirection.start}
                    end={heroGradientDirection.end}
                    style={styles.goalThumbnail}
                  />
                )}
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <EditableField
                style={styles.inlineTitleField}
                label="Title"
                value={goal.title}
                variant="title"
                placeholder="Goal title"
                validate={(next) => {
                  if (!next.trim()) {
                    return 'Title cannot be empty';
                  }
                  return null;
                }}
                onChange={(nextTitle) => {
                  const trimmed = nextTitle.trim();
                  if (!trimmed || trimmed === goal.title) {
                    return;
                  }
                  const timestamp = new Date().toISOString();
                  updateGoal(goal.id, (prev) => ({
                    ...prev,
                    title: trimmed,
                    updatedAt: timestamp,
                  }));
                }}
              />
            </View>
          </HStack>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setArcSelectorVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={arc ? 'Change connected arc' : 'Connect this goal to an arc'}
          >
            <HStack alignItems="center" space="xs" style={styles.arcRow}>
              <Icon
                name="goals"
                size={16}
                color={arc ? colors.textPrimary : colors.textSecondary}
              />
              <Text
                style={arc ? styles.arcChipTextConnected : styles.arcChipText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {arc ? `Arc · ${arc.name}` : 'Connect to an Arc'}
              </Text>
              <Icon name="chevronDown" size={16} color={colors.textSecondary} />
            </HStack>
          </TouchableOpacity>

          <View style={{ marginTop: spacing.sm }}>
            <EditableTextArea
              label="Description"
              value={goal.description ?? ''}
              placeholder="Add a short description"
              maxCollapsedLines={3}
              enableAi
              aiContext={{
                objectType: 'goal',
                objectId: goal.id,
                fieldId: 'description',
              }}
              onChange={(nextDescription) => {
                const trimmed = nextDescription.trim();
                const timestamp = new Date().toISOString();
                updateGoal(goal.id, (prev) => ({
                  ...prev,
                  description: trimmed.length === 0 ? undefined : trimmed,
                  updatedAt: timestamp,
                }));
              }}
              onRequestAiHelp={({ objectType, objectId, fieldId, currentText }) => {
                openForFieldContext({
                  objectType,
                  objectId,
                  fieldId,
                  currentText,
                  fieldLabel: 'Goal description',
                });
              }}
            />
          </View>
          <HStack space="md" alignItems="center" style={styles.timeRow}>
            {startDateLabel && (
              <Text style={styles.timeText}>
                Started {startDateLabel}
                {targetDateLabel ? ` · Target ${targetDateLabel}` : ''}
              </Text>
            )}
            {!startDateLabel && targetDateLabel && (
              <Text style={styles.timeText}>Target {targetDateLabel}</Text>
            )}
            <Text style={styles.statusText}>{goal.status.replace('_', ' ')}</Text>
          </HStack>
        </VStack>

        <VStack space="sm">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading style={styles.sectionTitle}>Force intent</Heading>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleForceEdit}
              accessibilityRole="button"
              accessibilityLabel={
                editingForces ? 'Save force intent updates' : 'Edit force intent'
              }
              style={styles.forceEditIconButton}
            >
              <Icon
                name="edit"
                size={16}
                color={editingForces ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
          </HStack>
          <VStack
            style={[styles.forceCard, editingForces && styles.editableFieldActive]}
            space="sm"
          >
            {FORCE_ORDER.map((forceId) => {
              const force = getCanonicalForce(forceId);
              if (!force) return null;
              const level = liveForceIntent[forceId] ?? 0;
              const percentage = (Number(level) / 3) * 100;

              if (!editingForces) {
                return (
                  <VStack key={forceId} space="xs">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text style={styles.forceLabel}>{force.name}</Text>
                      <Text style={styles.forceValue}>{level}/3</Text>
                    </HStack>
                    <View style={styles.forceBarTrack}>
                      <View style={[styles.forceBarFill, { width: `${percentage}%` }]} />
                    </View>
                  </VStack>
                );
              }

              return (
                <VStack key={forceId} space="xs">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text style={styles.forceLabel}>{force.name}</Text>
                    <Text style={styles.forceValue}>{level}/3</Text>
                  </HStack>
                  <HStack space="xs" style={styles.forceSliderRow}>
                    {[0, 1, 2, 3].map((value) => (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.8}
                        style={[
                          styles.forceLevelChip,
                          level === value && styles.forceLevelChipActive,
                        ]}
                        onPress={() => handleSetForceLevel(forceId, value as ForceLevel)}
                      >
                        <Text
                          style={[
                            styles.forceLevelChipText,
                            level === value && styles.forceLevelChipTextActive,
                          ]}
                        >
                          {value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </HStack>
                </VStack>
              );
            })}
          </VStack>
        </VStack>

        <VStack space="md">
          <HStack space="sm">
            <Button style={{ flex: 1 }}>
              <Text style={styles.primaryCtaText}>Generate Activities with AI</Text>
            </Button>
            <Button variant="outline" style={{ flex: 1 }}>
              <Text style={styles.secondaryCtaText}>Add Activity manually</Text>
            </Button>
          </HStack>
        </VStack>

        <VStack space="md" style={{ flex: 1 }}>
          <Heading style={styles.sectionTitle}>Activities</Heading>
          {goalActivities.length === 0 ? (
            <Text style={styles.emptyBody}>
              No Activities yet. These are the atomic units of doing—short, concrete steps that move
              this goal forward.
            </Text>
          ) : (
            <FlatList
              data={goalActivities}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={renderActivity}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </VStack>
      </VStack>
        </View>
      </TouchableWithoutFeedback>
      <EditGoalModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        initialTitle={goal.title}
        initialDescription={goal.description}
        initialForceIntent={forceIntent}
        onSubmit={handleSaveGoal}
        insetTop={insets.top}
      />
      <ArcSelectorModal
        visible={arcSelectorVisible}
        arcs={arcs}
        currentArcId={arc?.id ?? null}
        onClose={() => setArcSelectorVisible(false)}
        onSubmit={handleUpdateArc}
      />
      <AgentFab
        onPress={() => {
          openForScreenContext({ objectType: 'goal', objectId: goal.id });
        }}
      />
      {AgentWorkspaceSheet}
      <TakadoBottomSheet
        visible={thumbnailSheetVisible}
        onClose={() => setThumbnailSheetVisible(false)}
        snapPoints={['55%']}
      >
        <View style={styles.goalThumbnailSheetContent}>
          <Heading style={styles.goalThumbnailSheetTitle}>Goal thumbnail</Heading>
          <View style={styles.goalThumbnailSheetPreviewFrame}>
            <View style={styles.goalThumbnailSheetPreviewInner}>
              {goal.thumbnailUrl ? (
                <Image
                  source={{ uri: goal.thumbnailUrl }}
                  style={styles.goalThumbnailSheetImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={heroGradientColors}
                  start={heroGradientDirection.start}
                  end={heroGradientDirection.end}
                  style={styles.goalThumbnailSheetImage}
                />
              )}
            </View>
          </View>
          <HStack space="sm" style={styles.goalThumbnailSheetButtonsRow}>
            <Button
              variant="outline"
              style={styles.goalThumbnailSheetButton}
              onPress={handleShuffleGoalThumbnail}
            >
              <Text style={styles.goalThumbnailControlLabel}>Refresh</Text>
            </Button>
            <Button
              variant="outline"
              style={styles.goalThumbnailSheetButton}
              onPress={() => {
                void handleUploadGoalThumbnail();
              }}
            >
              <Text style={styles.goalThumbnailControlLabel}>Upload</Text>
            </Button>
          </HStack>
        </View>
      </TakadoBottomSheet>
    </AppShell>
  );
}

type EditGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  initialTitle: string;
  initialDescription?: string;
  initialForceIntent: Record<string, ForceLevel>;
  onSubmit: (values: {
    title: string;
    description?: string;
    forceIntent: Record<string, ForceLevel>;
  }) => void;
  insetTop: number;
};

function EditGoalModal({
  visible,
  onClose,
  initialTitle,
  initialDescription,
  initialForceIntent,
  onSubmit,
  insetTop,
}: EditGoalModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [forceIntent, setForceIntent] =
    useState<Record<string, ForceLevel>>(initialForceIntent);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setDescription(initialDescription ?? '');
      setForceIntent(initialForceIntent);
    }
  }, [visible, initialTitle, initialDescription, initialForceIntent]);

  const disabled = title.trim().length === 0;

  const handleSetForceLevel = (forceId: string, level: ForceLevel) => {
    setForceIntent((prev) => ({
      ...prev,
      [forceId]: level,
    }));
  };

  return (
    <TakadoBottomSheet visible={visible} onClose={onClose} snapPoints={['70%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
          <Heading style={styles.modalTitle}>Edit Goal</Heading>
          <Text style={styles.modalBody}>
            Update the goal details and rebalance the forces to better match this season.
          </Text>

          <Text style={styles.modalLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Goal title"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.modalLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Short description of this goal"
            placeholderTextColor="#6B7280"
            multiline
          />

          <ScrollView
            style={{ marginTop: spacing.lg }}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
          >
            <Text style={styles.modalLabel}>Forces</Text>
            <VStack space="md" style={{ marginTop: spacing.sm }}>
              {FORCE_ORDER.map((forceId) => {
                const force = getCanonicalForce(forceId);
                if (!force) return null;
                const currentLevel = forceIntent[forceId] ?? 0;
                return (
                  <VStack key={forceId} space="xs">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text style={styles.forceLabel}>{force.name}</Text>
                      <Text style={styles.forceValue}>{currentLevel}/3</Text>
                    </HStack>
                    <HStack space="xs" style={styles.forceSliderRow}>
                      {[0, 1, 2, 3].map((value) => (
                        <TouchableOpacity
                          key={value}
                          activeOpacity={0.8}
                          style={[
                            styles.forceLevelChip,
                            currentLevel === value && styles.forceLevelChipActive,
                          ]}
                          onPress={() => handleSetForceLevel(forceId, value as ForceLevel)}
                        >
                          <Text
                            style={[
                              styles.forceLevelChipText,
                              currentLevel === value && styles.forceLevelChipTextActive,
                            ]}
                          >
                            {value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  </VStack>
                );
              })}
            </VStack>
          </ScrollView>

          <HStack space="sm" marginTop={spacing.lg}>
            <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
              <Text style={styles.secondaryCtaText}>Cancel</Text>
            </Button>
            <Button
              style={{ flex: 1 }}
              disabled={disabled}
              onPress={() => onSubmit({ title, description, forceIntent })}
            >
              <Text style={styles.primaryCtaText}>Save</Text>
            </Button>
          </HStack>
        </View>
      </KeyboardAvoidingView>
    </TakadoBottomSheet>
  );
}

type ArcSelectorModalProps = {
  visible: boolean;
  arcs: Arc[];
  currentArcId: string | null;
  onClose: () => void;
  onSubmit: (arcId: string | null) => void;
};

function ArcSelectorModal({
  visible,
  arcs,
  currentArcId,
  onClose,
  onSubmit,
}: ArcSelectorModalProps) {
  const [selectedArcId, setSelectedArcId] = useState<string | null>(currentArcId);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedArcId(currentArcId);
      setQuery('');
    }
  }, [visible, currentArcId]);

  const filteredArcs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return arcs;
    return arcs.filter((arc) => {
      const name = arc.name.toLowerCase();
      const narrative = (arc.narrative ?? '').toLowerCase();
      return name.includes(term) || narrative.includes(term);
    });
  }, [arcs, query]);

  const handleConfirm = () => {
    onSubmit(selectedArcId);
  };

  const handleRemoveConnection = () => {
    setSelectedArcId(null);
  };

  const hasSelectionChanged = selectedArcId !== currentArcId;

  return (
    <TakadoBottomSheet visible={visible} onClose={onClose} snapPoints={['75%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
          <Heading style={styles.modalTitle}>Connect to an Arc</Heading>
          <Text style={styles.modalBody}>
            Choose an Arc this goal contributes to. You can change or remove this connection at any
            time.
          </Text>

          <Text style={styles.modalLabel}>Search arcs</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or narrative"
            placeholderTextColor="#6B7280"
          />

          <ScrollView
            style={{ marginTop: spacing.lg, flex: 1 }}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
          >
            <VStack space="sm">
              {filteredArcs.map((arc) => {
                const selected = selectedArcId === arc.id;
                return (
                  <TouchableOpacity
                    key={arc.id}
                    activeOpacity={0.8}
                    style={styles.arcOptionRow}
                    onPress={() => setSelectedArcId(arc.id)}
                  >
                    <VStack space="xs" flex={1}>
                      <Text style={styles.arcOptionName}>{arc.name}</Text>
                      {arc.narrative ? (
                        <Text
                          style={styles.arcOptionNarrative}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {arc.narrative}
                        </Text>
                      ) : null}
                    </VStack>
                    <View
                      style={[
                        styles.arcOptionRadio,
                        selected && styles.arcOptionRadioSelected,
                      ]}
                    >
                      {selected && <View style={styles.arcOptionRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filteredArcs.length === 0 && (
                <Text style={styles.emptyBody}>
                  No arcs match that search. Try a different phrase or clear the search.
                </Text>
              )}
            </VStack>
          </ScrollView>

          <VStack space="sm">
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.removeArcButton}
              onPress={handleRemoveConnection}
              disabled={currentArcId === null && selectedArcId === null}
            >
              <Text style={styles.removeArcText}>
                {currentArcId || selectedArcId ? 'Remove arc connection' : 'No arc connected'}
              </Text>
            </TouchableOpacity>

            <HStack space="sm" marginTop={spacing.sm}>
              <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
                <Text style={styles.secondaryCtaText}>Cancel</Text>
              </Button>
              <Button
                style={{ flex: 1 }}
                disabled={!hasSelectionChanged}
                onPress={handleConfirm}
              >
                <Text style={styles.primaryCtaText}>Save</Text>
              </Button>
            </HStack>
          </VStack>
        </View>
      </KeyboardAvoidingView>
    </TakadoBottomSheet>
  );
}

const styles = StyleSheet.create({
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
  arcRow: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignSelf: 'flex-start',
  },
  arcLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arcName: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  arcEmptyHelper: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcChipTextConnected: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  arcRight: {
    marginLeft: spacing.md,
  },
  arcChangeText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  goalTitle: {
    // Goal title – slightly smaller than the Arc header to keep this canvas
    // feeling focused without overwhelming the hero thumbnail.
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  goalTitleInput: {
    ...typography.titleMd,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  goalDescription: {
    // Goal description – make this slightly larger and higher contrast so it
    // reads as primary supporting context under the title.
    ...typography.body,
    color: colors.textPrimary,
  },
  goalDescriptionInput: {
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  timeRow: {
    marginTop: spacing.xs,
  },
  timeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  statusText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  forceCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  forceLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  forceValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceBarTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.cardMuted,
    overflow: 'hidden',
  },
  forceBarFill: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  primaryCtaText: {
    ...typography.body,
    color: colors.canvas,
  },
  secondaryCtaText: {
    ...typography.body,
    color: colors.accent,
  },
  activityCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  activityPhase: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  activityMeta: {
    ...typography.bodySm,
    color: colors.muted,
  },
  activityTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  activityNotes: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  separator: {
    height: spacing.md,
  },
  forceEditOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  goalThumbnailWrapper: {
    // Slightly smaller than the Arc thumbnail in the list so the title has
    // more breathing room and the header feels less top‑heavy.
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
  },
  goalThumbnailInner: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  goalThumbnail: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailControlsRow: {
    // no-op placeholder; controls moved into bottom sheet
    marginTop: 0,
  },
  goalThumbnailSheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  goalThumbnailSheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  goalThumbnailSheetPreviewFrame: {
    width: '100%',
    aspectRatio: 3 / 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
    marginBottom: spacing.lg,
  },
  goalThumbnailSheetPreviewInner: {
    flex: 1,
  },
  goalThumbnailSheetImage: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailSheetButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    columnGap: spacing.sm,
  },
  goalThumbnailSheetButton: {
    flexShrink: 1,
  },
  goalThumbnailControlLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  editableField: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inlineTitleField: {
    // Reduce vertical padding so the title row vertically centers better
    // alongside the goal thumbnail in the header.
    paddingVertical: spacing.sm,
  },
  // Remove top padding from the Goal title wrapper so the text baseline
  // aligns more closely with the top edge of the thumbnail.
  goalTitleEditableField: {
    paddingTop: 0,
  },
  editableFieldActive: {
    borderColor: colors.accent,
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
    minHeight: 48,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  forceSliderRow: {
    flexDirection: 'row',
  },
  forceLevelChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  forceLevelChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  forceLevelChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  forceLevelChipTextActive: {
    color: colors.canvas,
  },
  forceEditIconButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  arcOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  arcOptionName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  arcOptionNarrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  arcOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  arcOptionRadioSelected: {
    borderColor: colors.accent,
  },
  arcOptionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  removeArcButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  removeArcText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  objectTypeLabel: {
    // Match Arc detail header: slightly larger mixed-case label centered
    // between the navigation buttons.
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  firstGoalBadge: {
    ...typography.bodySm,
    color: colors.accent,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  firstGoalTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  firstGoalBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});


