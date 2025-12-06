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
  Text as RNText,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../ui/layout/AppShell';
import { Badge } from '../../ui/Badge';
import { cardSurfaceStyle, colors, spacing, typography, fonts } from '../../theme';
import { useAppStore, defaultForceLevels, getCanonicalForce } from '../../store/useAppStore';
import type { GoalDetailRouteParams } from '../../navigation/RootNavigator';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Dialog, VStack, Heading, Text, HStack } from '../../ui/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Arc, ForceLevel, ThumbnailStyle } from '../../domain/types';
import { KwiltBottomSheet } from '../../ui/BottomSheet';
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
import { useAgentLauncher } from '../ai/useAgentLauncher';
import * as ImagePicker from 'expo-image-picker';
import { ActivityListItem } from '../../ui/ActivityListItem';
import type { Activity } from '../../domain/types';

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
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
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
  const [vectorsInfoVisible, setVectorsInfoVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const [activityComposerVisible, setActivityComposerVisible] = useState(false);

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

  useEffect(() => {
    if (__DEV__) {
      // Track sheet visibility transitions so we can debug why the Arc selector
      // may not be appearing when expected.
      // eslint-disable-next-line no-console
      console.log('[goalDetail] arcSelectorVisible changed', arcSelectorVisible);
    }
  }, [arcSelectorVisible]);

  const goal = useMemo(() => goals.find((g) => g.id === goalId), [goals, goalId]);
  const arc = useMemo(() => arcs.find((a) => a.id === goal?.arcId), [arcs, goal?.arcId]);
  const [activeTab, setActiveTab] = useState<'details' | 'plan' | 'history'>('details');
  const goalActivities = useMemo(
    () => activities.filter((activity) => activity.goalId === goalId),
    [activities, goalId]
  );

  const handleToggleActivityComplete = useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (activity) => {
        const nextIsDone = activity.status !== 'done';
        return {
          ...activity,
          status: nextIsDone ? 'done' : 'planned',
          completedAt: nextIsDone ? timestamp : null,
          updatedAt: timestamp,
        };
      });
    },
    [updateActivity]
  );

  const handleToggleActivityPriorityOne = useCallback(
    (activityId: string) => {
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (activity) => {
        const nextPriority = activity.priority === 1 ? undefined : 1;
        return {
          ...activity,
          priority: nextPriority,
          updatedAt: timestamp,
        };
      });
    },
    [updateActivity]
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

  const statusRaw = goal.status.replace('_', ' ');
  const statusLabel = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

  const updatedAtLabel = goal.updatedAt
    ? new Date(goal.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  const createdAtLabel = goal.createdAt
    ? new Date(goal.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

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

  const handleOpenArcSelector = () => {
    if (__DEV__) {
      // Instrument tap behavior so we can debug Arc connection interactions.
      // eslint-disable-next-line no-console
      console.log('[goalDetail] Arc connection field pressed', {
        goalId: goal.id,
        currentArcId: goal.arcId || null,
      });
    }
    setArcSelectorVisible(true);
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

  const renderActivity = ({ item }: { item: Activity }) => {
    const phase = item.phase ?? undefined;
    const metaParts = [phase].filter(Boolean);
    const meta = metaParts.length > 0 ? metaParts.join(' · ') : undefined;

    return (
      <ActivityListItem
        title={item.title}
        meta={meta}
        isCompleted={item.status === 'done'}
        onToggleComplete={() => handleToggleActivityComplete(item.id)}
        isPriorityOne={item.priority === 1}
        onTogglePriority={() => handleToggleActivityPriorityOne(item.id)}
      />
    );
  };

  const handleCreateActivityFromPlan = (values: { title: string; notes?: string }) => {
    const trimmedTitle = values.title.trim();
    if (!trimmedTitle) {
      return;
    }

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const nextActivity: Activity = {
      id,
      goalId: goal.id,
      title: trimmedTitle,
      notes: values.notes?.trim().length ? values.notes.trim() : undefined,
      reminderAt: null,
      priority: undefined,
      estimateMinutes: null,
      scheduledDate: null,
      repeatRule: undefined,
      orderIndex: (activities.length || 0) + 1,
      phase: null,
      status: 'planned',
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      forceActual: defaultForceLevels(0),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    addActivity(nextActivity);
    setActivityComposerVisible(false);
  };

  return (
    <AppShell>
      <Dialog
        visible={showFirstGoalCelebration}
        onClose={handleDismissFirstGoalCelebration}
        title="You just set your first goal"
        description="This goal is your starting point in kwilt. Next, add a couple of concrete Activities so you always know the very next step."
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
                  <Text style={styles.objectTypeLabel}>Goal - DEV</Text>
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

              {/* Canvas mode toggle: Details vs Plan vs History */}
              <View style={styles.segmentedControlRow}>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Show goal details"
                    style={[
                      styles.segmentedOption,
                      activeTab === 'details' && styles.segmentedOptionActive,
                    ]}
                    onPress={() => setActiveTab('details')}
                  >
                    <Text
                      style={[
                        styles.segmentedOptionLabel,
                        activeTab === 'details' && styles.segmentedOptionLabelActive,
                      ]}
                    >
                      Details
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Show goal plan and activities"
                    style={[
                      styles.segmentedOption,
                      activeTab === 'plan' && styles.segmentedOptionActive,
                    ]}
                    onPress={() => setActiveTab('plan')}
                  >
                    <Text
                      style={[
                        styles.segmentedOptionLabel,
                        activeTab === 'plan' && styles.segmentedOptionLabelActive,
                      ]}
                    >
                      Plan
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Show goal history"
                    style={[
                      styles.segmentedOption,
                      activeTab === 'history' && styles.segmentedOptionActive,
                    ]}
                    onPress={() => setActiveTab('history')}
                  >
                    <Text
                      style={[
                        styles.segmentedOptionLabel,
                        activeTab === 'history' && styles.segmentedOptionLabelActive,
                      ]}
                    >
                      History
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </VStack>

            {activeTab === 'details' && (
              <VStack space="md">
                <View style={{ marginTop: spacing.md }}>
                  <HStack style={styles.timeRow}>
                    <VStack space="xs" style={styles.lifecycleColumn}>
                      <Text style={styles.timeLabel}>Status</Text>
                      <Badge
                        variant={
                          goal.status === 'in_progress'
                            ? 'default'
                            : goal.status === 'planned'
                              ? 'secondary'
                              : 'secondary'
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </VStack>
                    <VStack space="xs" style={styles.lifecycleColumn}>
                      <Text style={styles.timeLabel}>Last modified</Text>
                      <Text style={styles.timeText}>
                        {updatedAtLabel ?? 'Just now'}
                      </Text>
                    </VStack>
                  </HStack>
                </View>

                <View style={{ marginTop: spacing.md }}>
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

                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.arcConnectionLabel}>Arc</Text>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleOpenArcSelector}
                    accessibilityRole="button"
                    accessibilityLabel={arc ? 'Change connected arc' : 'Connect this goal to an arc'}
                  >
                    <HStack
                      alignItems="center"
                      justifyContent="space-between"
                      style={styles.arcRow}
                    >
                      <Text
                        style={arc ? styles.arcChipTextConnected : styles.arcChipText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {arc ? arc.name : 'Connect to an Arc'}
                      </Text>
                      <Icon name="chevronDown" size={16} color={colors.textSecondary} />
                    </HStack>
                  </TouchableOpacity>
                </View>

                <HStack justifyContent="space-between" alignItems="center">
                  <HStack alignItems="center" space="xs">
                    <Text style={styles.forceIntentLabel}>Vectors for this goal</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setVectorsInfoVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Learn how vectors work for this goal"
                      style={styles.forceInfoIconButton}
                    >
                      <Icon name="info" size={16} color={colors.muted} />
                    </TouchableOpacity>
                  </HStack>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleToggleForceEdit}
                    accessibilityRole="button"
                    accessibilityLabel={
                      editingForces
                        ? 'Save vector balance updates'
                        : 'Edit how this goal moves different vectors in your life'
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
                  space="xs"
                >
                  {FORCE_ORDER.map((forceId) => {
                    const force = getCanonicalForce(forceId);
                    if (!force) return null;
                    const level = liveForceIntent[forceId] ?? 0;
                    const percentage = (Number(level) / 3) * 100;

                    if (!editingForces) {
                      return (
                        <HStack key={forceId} style={styles.forceRow} alignItems="center">
                          <Text style={styles.forceLabel}>{force.name}</Text>
                          <View style={styles.forceBarWrapper}>
                            <View style={styles.forceBarTrack}>
                              <View style={[styles.forceBarFill, { width: `${percentage}%` }]} />
                            </View>
                          </View>
                          <Text style={styles.forceValue}>{level}/3</Text>
                        </HStack>
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
                {createdAtLabel && (
                  <Text style={styles.createdAtText}>Created {createdAtLabel}</Text>
                )}
              </VStack>
            )}

            {activeTab === 'history' && (
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: spacing.md,
                  paddingBottom: spacing.lg,
                  paddingTop: spacing.md,
                }}
              >
                <RNText
                  style={{
                    fontSize: 28,
                    color: 'blue',
                    fontWeight: 'bold',
                    marginTop: 80,
                  }}
                >
                  HELLO FROM HISTORY DEBUG
                </RNText>
              </View>
            )}

            {activeTab === 'plan' && (
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: spacing.md,
                  paddingBottom: spacing.lg,
                  paddingTop: spacing.md,
                }}
              >
                <RNText
                  style={{
                    fontSize: 28,
                    color: 'red',
                    fontWeight: 'bold',
                    marginTop: 80,
                  }}
                >
                  HELLO FROM PLAN DEBUG ({goalActivities.length})
                </RNText>
              </View>
            )}
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
      {/* Agent FAB entry for Goal detail is temporarily disabled for MVP.
          Once the tap-centric Agent entry is refined for object canvases,
          we can reintroduce a contextual FAB here that fits the final UX. */}
      {AgentWorkspaceSheet}
      <KwiltBottomSheet
        visible={vectorsInfoVisible}
        onClose={() => setVectorsInfoVisible(false)}
        snapPoints={['40%']}
      >
        <VStack space="md" style={styles.vectorInfoContent}>
          <Heading style={styles.vectorInfoTitle}>What are Vectors?</Heading>
          <Text style={styles.vectorInfoBody}>
            Vectors are the core directions of your life that this goal can move — like activity,
            connection, mastery, and spirituality.
          </Text>
          <Text style={styles.vectorInfoBody}>
            Use the levels to show how much this goal is about each vector. We use this to shape
            better suggestions, reflections, and plans with you.
          </Text>
          <View style={styles.vectorInfoFooter}>
            <Button variant="ghost" onPress={() => setVectorsInfoVisible(false)}>
              <Text style={styles.vectorInfoCloseLabel}>Got it</Text>
            </Button>
          </View>
        </VStack>
      </KwiltBottomSheet>
      <KwiltBottomSheet
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
      </KwiltBottomSheet>
      <GoalActivityComposerModal
        visible={activityComposerVisible}
        onClose={() => setActivityComposerVisible(false)}
        onSubmit={handleCreateActivityFromPlan}
        insetTop={insets.top}
      />
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
    <KwiltBottomSheet visible={visible} onClose={onClose} snapPoints={['70%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
          <Heading style={styles.modalTitle}>Edit Goal</Heading>
          <Text style={styles.modalBody}>
            Update the goal details and rebalance the forces to better match where you are right now.
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
    </KwiltBottomSheet>
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
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[goalDetail] ArcSelectorModal opened', {
          currentArcId,
          availableArcs: arcs.length,
        });
      }
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
    <KwiltBottomSheet visible={visible} onClose={onClose} snapPoints={['75%']}>
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

          <TextInput
            style={[styles.input, styles.arcSearchInput]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search arcs…"
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
                    style={[
                      styles.arcOptionRow,
                      selected && styles.arcOptionRowSelected,
                    ]}
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
    </KwiltBottomSheet>
  );
}

type GoalActivityComposerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: { title: string; notes?: string }) => void;
  insetTop: number;
};

function GoalActivityComposerModal({
  visible,
  onClose,
  onSubmit,
  insetTop,
}: GoalActivityComposerModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setTitle('');
      setNotes('');
    }
  }, [visible]);

  const disabled = title.trim().length === 0;

  const handleSubmit = () => {
    if (disabled) return;
    onSubmit({ title, notes: notes.trim().length > 0 ? notes : undefined });
  };

  return (
    <KwiltBottomSheet visible={visible} onClose={onClose} snapPoints={['55%']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.modalOverlay, { paddingTop: insetTop }]}
      >
        <View style={[styles.modalContent, { paddingTop: spacing.lg }]}>
          <Heading style={styles.modalTitle}>Add Activity</Heading>
          <Text style={styles.modalBody}>
            Capture a concrete step that moves this goal forward. You can refine details later from
            the Activities canvas.
          </Text>

          <Text style={styles.modalLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Measure the desk area"
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a short note or checklist for this activity."
            placeholderTextColor="#6B7280"
            multiline
          />

          <HStack space="sm" marginTop={spacing.lg}>
            <Button variant="outline" style={{ flex: 1 }} onPress={onClose}>
              <Text style={styles.secondaryCtaText}>Cancel</Text>
            </Button>
            <Button style={{ flex: 1 }} disabled={disabled} onPress={handleSubmit}>
              <Text style={styles.primaryCtaText}>Add</Text>
            </Button>
          </HStack>
        </View>
      </KeyboardAvoidingView>
    </KwiltBottomSheet>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    width: '100%',
  },
  arcConnectionLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  timeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  timeLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  lifecycleLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    paddingLeft: spacing.md,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  lifecycleColumn: {
    flex: 1,
  },
  forceIntentLabel: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    paddingLeft: spacing.md,
  },
  forceInfoIconButton: {
    padding: spacing.xs,
  },
  forceCard: {
    ...cardSurfaceStyle,
    padding: spacing.lg,
  },
  forceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  forceBarWrapper: {
    flex: 1,
  },
  forceLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
    minWidth: 120,
  },
  forceValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
  forceBarTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.cardMuted,
    overflow: 'hidden',
    width: '100%',
  },
  forceBarFill: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  createdAtText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  historyHintText: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  vectorInfoContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  vectorInfoTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  vectorInfoBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  vectorInfoFooter: {
    marginTop: spacing.md,
    alignItems: 'flex-end',
  },
  vectorInfoCloseLabel: {
    ...typography.bodySm,
    color: colors.accent,
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
  addActivityLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  planEmptyState: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  planEmptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  planEmptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  planEmptyHint: {
    ...typography.bodySm,
    color: colors.muted,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  arcOptionRowSelected: {
    backgroundColor: colors.shellAlt,
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
  arcSearchInput: {
    marginTop: spacing.md,
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
  segmentedControlRow: {
    marginTop: spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
    alignSelf: 'flex-start',
  },
  segmentedOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  segmentedOptionActive: {
    backgroundColor: colors.canvas,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentedOptionLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  segmentedOptionLabelActive: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
});


