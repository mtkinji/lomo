import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { ActivityStatus, ActivityStep } from '../../domain/types';
import type {
  ActivitiesStackParamList,
  ActivityDetailRouteParams,
} from '../../navigation/RootNavigator';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { VStack, HStack } from '../../ui/primitives';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type ActivityDetailRouteProp = RouteProp<
  { ActivityDetail: ActivityDetailRouteParams },
  'ActivityDetail'
>;

type ActivityDetailNavigationProp = NativeStackNavigationProp<
  ActivitiesStackParamList,
  'ActivityDetail'
>;

export function ActivityDetailScreen() {
  const route = useRoute<ActivityDetailRouteProp>();
  const navigation = useNavigation<ActivityDetailNavigationProp>();
  const { activityId } = route.params;

  const activities = useAppStore((state) => state.activities);
  const goals = useAppStore((state) => state.goals);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const recordShowUp = useAppStore((state) => state.recordShowUp);

  const activity = useMemo(
    () => activities.find((item) => item.id === activityId),
    [activities, activityId],
  );

  const goalTitle = useMemo(() => {
    if (!activity?.goalId) return undefined;
    const goal = goals.find((g) => g.id === activity.goalId);
    return goal?.title;
  }, [activity?.goalId, goals]);

  const [reminderSheetVisible, setReminderSheetVisible] = useState(false);
  const [dueDateSheetVisible, setDueDateSheetVisible] = useState(false);
  const [repeatSheetVisible, setRepeatSheetVisible] = useState(false);
  const [isDueDatePickerVisible, setIsDueDatePickerVisible] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(activity?.title ?? '');
  const titleInputRef = useRef<TextInput | null>(null);

  const [notesDraft, setNotesDraft] = useState(activity?.notes ?? '');
  const [stepsDraft, setStepsDraft] = useState<ActivityStep[]>(activity?.steps ?? []);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [isAddingStepInline, setIsAddingStepInline] = useState(false);
  const newStepInputRef = useRef<TextInput | null>(null);

  const handleBackToActivities = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('ActivitiesList');
    }
  };

  if (!activity) {
    return (
      <AppShell>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Activity not found</Text>
          <Text style={styles.emptyBody}>
            This activity may have been deleted or moved.
          </Text>
        </View>
      </AppShell>
    );
  }

  const isCompleted = activity.status === 'done';

  const handleDeleteActivity = () => {
    Alert.alert(
      'Delete activity?',
      'This will remove the activity from your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeActivity(activity.id);
            handleBackToActivities();
          },
        },
      ],
    );
  };

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (!next || next === activity.title) {
      setIsEditingTitle(false);
      setTitleDraft(activity.title);
      return;
    }
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      title: next,
      updatedAt: timestamp,
    }));
    setIsEditingTitle(false);
  };

  const commitNotes = () => {
    const next = notesDraft.trim();
    const current = activity.notes ?? '';
    if (next === current) {
      return;
    }
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      notes: next.length ? next : undefined,
      updatedAt: timestamp,
    }));
  };

  const deriveStatusFromSteps = (
    prevStatus: ActivityStatus,
    nextSteps: ActivityStep[],
    timestamp: string,
    prevCompletedAt?: string | null
  ) => {
    if (nextSteps.length === 0) {
      return { nextStatus: prevStatus, nextCompletedAt: prevCompletedAt ?? null };
    }

    const requiredSteps = nextSteps.filter((step) => !step.isOptional);
    const allRequiredComplete = requiredSteps.length > 0 && requiredSteps.every((s) => !!s.completedAt);
    const anyStepComplete = nextSteps.some((s) => !!s.completedAt);

    let nextStatus: ActivityStatus = prevStatus;
    if (allRequiredComplete) {
      nextStatus = 'done';
    } else if (anyStepComplete && prevStatus === 'planned') {
      nextStatus = 'in_progress';
    } else if (!anyStepComplete && prevStatus === 'in_progress') {
      nextStatus = 'planned';
    } else if (!anyStepComplete && prevStatus === 'done') {
      nextStatus = 'in_progress';
    }

    const nextCompletedAt = nextStatus === 'done' ? prevCompletedAt ?? timestamp : null;

    return { nextStatus, nextCompletedAt };
  };

  const applyStepUpdate = (updater: (current: ActivityStep[]) => ActivityStep[]) => {
    const timestamp = new Date().toISOString();
    let markedDone = false;
    let nextLocalSteps: ActivityStep[] = [];

    updateActivity(activity.id, (prev) => {
      const currentSteps = prev.steps ?? [];
      const nextSteps = updater(currentSteps);
      nextLocalSteps = nextSteps;
      const { nextStatus, nextCompletedAt } = deriveStatusFromSteps(
        prev.status,
        nextSteps,
        timestamp,
        prev.completedAt
      );

      if (prev.status !== 'done' && nextStatus === 'done') {
        markedDone = true;
      }

      return {
        ...prev,
        steps: nextSteps,
        status: nextStatus,
        completedAt: nextCompletedAt ?? prev.completedAt ?? null,
        updatedAt: timestamp,
      };
    });

    setStepsDraft(nextLocalSteps);

    if (markedDone) {
      recordShowUp();
    }
  };

  const handleToggleStepComplete = (stepId: string) => {
    const completedAt = new Date().toISOString();
    applyStepUpdate((steps) =>
      steps.map((step) =>
        step.id === stepId ? { ...step, completedAt: step.completedAt ? null : completedAt } : step
      )
    );
  };

  const handleChangeStepTitle = (stepId: string, title: string) => {
    applyStepUpdate((steps) => steps.map((step) => (step.id === stepId ? { ...step, title } : step)));
  };

  const handleToggleStepOptional = (stepId: string) => {
    applyStepUpdate((steps) =>
      steps.map((step) => (step.id === stepId ? { ...step, isOptional: !step.isOptional } : step))
    );
  };

  const handleRemoveStep = (stepId: string) => {
    applyStepUpdate((steps) => steps.filter((step) => step.id !== stepId));
  };

  const handleAddStep = () => {
    const newStep: ActivityStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      completedAt: null,
      isOptional: false,
      orderIndex: stepsDraft.length,
    };
    applyStepUpdate((steps) => [...steps, newStep]);
  };

  const beginAddStepInline = () => {
    setIsAddingStepInline(true);
    setNewStepTitle('');
    requestAnimationFrame(() => {
      newStepInputRef.current?.focus();
    });
  };

  const commitInlineStep = () => {
    const trimmed = newStepTitle.trim();
    if (!trimmed) {
      setIsAddingStepInline(false);
      setNewStepTitle('');
      return;
    }

    const newStep: ActivityStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      completedAt: null,
      isOptional: false,
      orderIndex: stepsDraft.length,
    };
    applyStepUpdate((steps) => [...steps, newStep]);
    setIsAddingStepInline(false);
    setNewStepTitle('');
  };

  const handleToggleComplete = () => {
    const timestamp = new Date().toISOString();
    const wasCompleted = isCompleted;
    updateActivity(activity.id, (prev) => {
      const nextIsDone = prev.status !== 'done';
      const nextSteps =
        prev.steps?.map((step) =>
          nextIsDone && !step.completedAt ? { ...step, completedAt: timestamp } : step
        ) ?? prev.steps;
      return {
        ...prev,
        steps: nextSteps,
        status: nextIsDone ? 'done' : 'planned',
        completedAt: nextIsDone ? timestamp : null,
        updatedAt: timestamp,
      };
    });
    if (!wasCompleted) {
      // Toggling from not-done to done counts as "showing up" for the day.
      recordShowUp();
    }
  };

  const handleSelectReminder = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    // Default to 9am local time for quick picks.
    date.setHours(9, 0, 0, 0);
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: date.toISOString(),
      updatedAt: timestamp,
    }));
    setReminderSheetVisible(false);
  };

  const handleSelectDueDate = (offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(23, 0, 0, 0);
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledDate: date.toISOString(),
      updatedAt: timestamp,
    }));
    setDueDateSheetVisible(false);
  };

  const handleClearDueDate = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledDate: null,
      updatedAt: timestamp,
    }));
    setDueDateSheetVisible(false);
    setIsDueDatePickerVisible(false);
  };

  const getInitialDueDateForPicker = () => {
    if (activity.scheduledDate) {
      const parsed = new Date(activity.scheduledDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  };

  const handleDueDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsDueDatePickerVisible(false);
    }

    if (!date || event.type === 'dismissed') {
      return;
    }

    const next = new Date(date);
    // Treat due dates as "end of day" semantics.
    next.setHours(23, 0, 0, 0);

    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      scheduledDate: next.toISOString(),
      updatedAt: timestamp,
    }));

    // Once a date is chosen, close the sheet to confirm the selection.
    setDueDateSheetVisible(false);
  };

  const handleSelectRepeat = (rule: NonNullable<typeof activity.repeatRule>) => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      repeatRule: rule,
      updatedAt: timestamp,
    }));
    setRepeatSheetVisible(false);
  };

  const reminderLabel = useMemo(() => {
    if (!activity.reminderAt) return 'None';
    const date = new Date(activity.reminderAt);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [activity.reminderAt]);

  const dueDateLabel = useMemo(() => {
    if (!activity.scheduledDate) return 'None';
    const date = new Date(activity.scheduledDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [activity.scheduledDate]);

  const repeatLabel = activity.repeatRule
    ? activity.repeatRule === 'weekdays'
      ? 'Weekdays'
      : activity.repeatRule.charAt(0).toUpperCase() + activity.repeatRule.slice(1)
    : 'Off';

  const completedStepsCount = useMemo(
    () => (activity.steps ?? []).filter((step) => !!step.completedAt).length,
    [activity.steps]
  );
  const totalStepsCount = activity.steps?.length ?? 0;

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
    return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min`;
  };

  const {
    timeEstimateLabel,
    timeEstimateIsAi,
    difficultyLabel,
    difficultyIsAi,
  } = useMemo(() => {
    const manualMinutes = activity.estimateMinutes ?? null;
    const aiMinutes = activity.aiPlanning?.estimateMinutes ?? null;

    const pickMinutes = () => {
      if (manualMinutes != null) {
        return {
          label: formatMinutes(manualMinutes),
          isAi: false,
        };
      }
      if (aiMinutes != null) {
        return {
          label: `${formatMinutes(aiMinutes)} · AI suggestion`,
          isAi: true,
        };
      }
      return {
        label: 'Add a rough time estimate',
        isAi: false,
      };
    };

    const manualDifficulty = activity.difficulty ?? null;
    const aiDifficulty = activity.aiPlanning?.difficulty ?? null;

    const formatDifficulty = (value: string) => {
      switch (value) {
        case 'very_easy':
          return 'Very easy';
        case 'easy':
          return 'Easy';
        case 'medium':
          return 'Medium';
        case 'hard':
          return 'Hard';
        case 'very_hard':
          return 'Very hard';
        default:
          return value;
      }
    };

    const pickDifficulty = () => {
      if (manualDifficulty) {
        return {
          label: formatDifficulty(manualDifficulty),
          isAi: false,
        };
      }
      if (aiDifficulty) {
        return {
          label: `${formatDifficulty(aiDifficulty)} · AI suggestion`,
          isAi: true,
        };
      }
      return {
        label: 'Optional: how heavy does this feel?',
        isAi: false,
      };
    };

    const minutes = pickMinutes();
    const difficulty = pickDifficulty();

    return {
      timeEstimateLabel: minutes.label,
      timeEstimateIsAi: minutes.isAi,
      difficultyLabel: difficulty.label,
      difficultyIsAi: difficulty.isAi,
    };
  }, [activity.estimateMinutes, activity.aiPlanning, activity.difficulty]);

  useEffect(() => {
    setTitleDraft(activity.title ?? '');
    setNotesDraft(activity.notes ?? '');
    setStepsDraft(activity.steps ?? []);
  }, [activity.title, activity.notes, activity.steps]);

  return (
    <AppShell>
      <View style={styles.screen}>
        <VStack space="lg" style={styles.pageContent}>
          <HStack alignItems="center">
            <View style={styles.headerSide}>
              <IconButton
                style={styles.backButton}
                onPress={handleBackToActivities}
                accessibilityLabel="Back to Activities"
              >
                <Icon name="arrowLeft" size={20} color={colors.canvas} />
              </IconButton>
            </View>
            <View style={styles.headerCenter}>
              <View style={styles.objectTypeRow}>
                <Icon name="activities" size={18} color={colors.textSecondary} />
                <Text style={styles.objectTypeLabel}>Activity</Text>
              </View>
            </View>
            <View style={styles.headerSideRight}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton style={styles.optionsButton} accessibilityLabel="Activity actions">
                    <Icon name="more" size={18} color={colors.canvas} />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                  <DropdownMenuItem onPress={handleDeleteActivity} variant="destructive">
                    <Text style={styles.destructiveMenuRowText}>Delete activity</Text>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </View>
          </HStack>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <VStack space="lg">
                <View style={styles.activityHeaderRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isCompleted ? 'Mark activity as not done' : 'Mark activity as done'
                    }
                    hitSlop={8}
                    onPress={handleToggleComplete}
                  >
                    <View
                      style={[
                        styles.checkboxBase,
                        isCompleted ? styles.checkboxCompleted : styles.checkboxPlanned,
                      ]}
                    >
                      {isCompleted ? (
                        <Icon name="check" size={14} color={colors.primaryForeground} />
                      ) : null}
                    </View>
                  </Pressable>

                  <Pressable
                    style={styles.titlePressable}
                    onPress={() => {
                      if (!isEditingTitle) {
                        setIsEditingTitle(true);
                        requestAnimationFrame(() => {
                          titleInputRef.current?.focus();
                        });
                      }
                    }}
                  >
                    {isEditingTitle ? (
                      <TextInput
                        ref={titleInputRef}
                        style={styles.titleInput}
                        value={titleDraft}
                        onChangeText={setTitleDraft}
                        placeholder="Name this activity"
                        placeholderTextColor={colors.muted}
                        onBlur={commitTitle}
                        onSubmitEditing={commitTitle}
                        multiline
                        scrollEnabled={false}
                        blurOnSubmit
                        returnKeyType="done"
                      />
                    ) : (
                      <Text style={styles.titleText}>{activity.title || 'Name this activity'}</Text>
                    )}
                  </Pressable>
                </View>

                {goalTitle ? (
                  <Text style={styles.metaText}>Linked goal · {goalTitle}</Text>
                ) : null}
              </VStack>
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.section}>
              <Text style={styles.inputLabel}>NOTES</Text>
              <View style={styles.rowsCard}>
                <TextInput
                  style={styles.notesInput}
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  onBlur={commitNotes}
                  placeholder="Add context or reminders for this activity."
                  placeholderTextColor={colors.muted}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.section}>
              <HStack alignItems="center" style={styles.sectionLabelRow}>
                <Text style={styles.inputLabel}>
                  {`STEPS${totalStepsCount > 0 ? ` · ${completedStepsCount}/${totalStepsCount}` : ''}`}
                </Text>
              </HStack>
              <View style={styles.rowsCard}>
                {stepsDraft.length === 0 ? (
                  <Text style={styles.stepsEmpty}>
                    Add 2–6 small steps so this activity is crystal clear.
                  </Text>
                ) : (
                  <VStack space="xs">
                    {stepsDraft.map((step) => {
                      const isChecked = !!step.completedAt;
                      return (
                        <HStack key={step.id} space="xs" alignItems="center" style={styles.stepRow}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                              isChecked ? 'Mark step as not done' : 'Mark step as done'
                            }
                            hitSlop={8}
                            onPress={() => handleToggleStepComplete(step.id)}
                          >
                            <View
                              style={[
                                styles.checkboxBase,
                                isChecked ? styles.checkboxCompleted : styles.checkboxPlanned,
                                styles.stepCheckbox,
                              ]}
                            >
                              {isChecked ? (
                                <Icon name="check" size={12} color={colors.primaryForeground} />
                              ) : null}
                            </View>
                          </Pressable>
                          <TextInput
                            style={styles.stepInput}
                            value={step.title}
                            onChangeText={(text) => handleChangeStepTitle(step.id, text)}
                            placeholder="Describe the step"
                            placeholderTextColor={colors.muted}
                            multiline
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            iconButtonSize={24}
                            onPress={() => handleRemoveStep(step.id)}
                            accessibilityLabel="Remove step"
                            style={styles.removeStepButton}
                          >
                            <Icon name="close" size={14} color={colors.textSecondary} />
                          </Button>
                        </HStack>
                      );
                    })}
                  </VStack>
                )}
                <View style={styles.addStepInlineRow}>
                  {isAddingStepInline ? (
                    <HStack space="xs" alignItems="center" style={styles.stepRow}>
                      <View
                        style={[
                          styles.checkboxBase,
                          styles.checkboxPlanned,
                          styles.stepCheckbox,
                        ]}
                      />
                      <TextInput
                        ref={newStepInputRef}
                        style={styles.stepInput}
                        value={newStepTitle}
                        onChangeText={setNewStepTitle}
                        placeholder="Add step"
                        placeholderTextColor={colors.muted}
                        multiline
                        returnKeyType="done"
                        blurOnSubmit
                        onSubmitEditing={commitInlineStep}
                        onBlur={commitInlineStep}
                      />
                    </HStack>
                  ) : (
                    <Pressable
                      onPress={beginAddStepInline}
                      accessibilityRole="button"
                      accessibilityLabel="Add a step to this activity"
                    >
                      <HStack space="xs" alignItems="center">
                        <Icon name="plus" size={16} color={colors.primary} />
                        <Text style={styles.addStepInlineText}>Add step</Text>
                      </HStack>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.rowsCard}>
                <VStack space="xs">
                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setReminderSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit reminder"
                    >
                      <HStack space="sm" alignItems="center" style={styles.rowContent}>
                        <Icon name="daily" size={16} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.rowValue,
                            reminderLabel !== 'None' && styles.rowLabelActive,
                          ]}
                        >
                          {reminderLabel === 'None' ? 'Add reminder' : reminderLabel}
                        </Text>
                      </HStack>
                    </Pressable>
                  </VStack>

                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setDueDateSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit due date"
                    >
                      <HStack
                        space="sm"
                        alignItems="center"
                        justifyContent="space-between"
                        style={styles.rowContent}
                      >
                        <HStack space="sm" alignItems="center" flex={1}>
                          <Icon name="today" size={16} color={colors.textSecondary} />
                          <Text
                            style={[
                              styles.rowValue,
                              activity.scheduledDate && styles.rowLabelActive,
                            ]}
                          >
                            {activity.scheduledDate ? dueDateLabel : 'Add due date'}
                          </Text>
                        </HStack>
                        {activity.scheduledDate ? (
                          <Pressable
                            onPress={(event) => {
                              event.stopPropagation();
                              handleClearDueDate();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Clear due date"
                            hitSlop={8}
                          >
                            <Icon name="close" size={16} color={colors.textSecondary} />
                          </Pressable>
                        ) : null}
                      </HStack>
                    </Pressable>
                  </VStack>

                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setRepeatSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit repeat schedule"
                    >
                      <HStack space="sm" alignItems="center" style={styles.rowContent}>
                        <Icon name="refresh" size={16} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.rowValue,
                            repeatLabel !== 'Off' && styles.rowLabelActive,
                          ]}
                        >
                          {repeatLabel === 'Off' ? 'Off' : repeatLabel}
                        </Text>
                      </HStack>
                    </Pressable>
                  </VStack>
                </VStack>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.rowsCard}>
                <VStack space="xs">
                  <Text style={styles.planningHeader}>Planning</Text>

                  <View style={styles.row}>
                    <HStack space="sm" alignItems="center" style={styles.rowContent}>
                      <Icon name="time" size={16} color={colors.textSecondary} />
                      <Text style={styles.rowLabel}>Time estimate</Text>
                    </HStack>
                    <View style={styles.rowRight}>
                      <Text
                        style={[
                          styles.rowValue,
                          timeEstimateIsAi && styles.rowValueAi,
                        ]}
                        numberOfLines={1}
                      >
                        {timeEstimateLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <HStack space="sm" alignItems="center" style={styles.rowContent}>
                      <Icon name="signal" size={16} color={colors.textSecondary} />
                      <Text style={styles.rowLabel}>Difficulty</Text>
                    </HStack>
                    <View style={styles.rowRight}>
                      <Text
                        style={[
                          styles.rowValue,
                          difficultyIsAi && styles.rowValueAi,
                        ]}
                        numberOfLines={1}
                      >
                        {difficultyLabel}
                      </Text>
                    </View>
                  </View>
                </VStack>
              </View>
            </View>
          </ScrollView>
        </VStack>
      </View>

      <BottomDrawer
        visible={reminderSheetVisible}
        onClose={() => setReminderSheetVisible(false)}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Remind me</Text>
          <VStack space="sm">
            <SheetOption label="Later Today" onPress={() => handleSelectReminder(0)} />
            <SheetOption label="Tomorrow" onPress={() => handleSelectReminder(1)} />
            <SheetOption label="Next Week" onPress={() => handleSelectReminder(7)} />
          </VStack>
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={dueDateSheetVisible}
        onClose={() => {
          setDueDateSheetVisible(false);
          setIsDueDatePickerVisible(false);
        }}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Due</Text>
          <VStack space="sm">
            <SheetOption label="Today" onPress={() => handleSelectDueDate(0)} />
            <SheetOption label="Tomorrow" onPress={() => handleSelectDueDate(1)} />
            <SheetOption label="Next Week" onPress={() => handleSelectDueDate(7)} />
            <SheetOption
              label="Pick a date…"
              onPress={() => setIsDueDatePickerVisible(true)}
            />
            <SheetOption label="Clear due date" onPress={handleClearDueDate} />
          </VStack>
          {isDueDatePickerVisible && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                value={getInitialDueDateForPicker()}
                onChange={handleDueDateChange}
              />
            </View>
          )}
        </View>
      </BottomDrawer>

      <BottomDrawer
        visible={repeatSheetVisible}
        onClose={() => setRepeatSheetVisible(false)}
        snapPoints={['45%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Repeat</Text>
          <VStack space="sm">
            <SheetOption label="Daily" onPress={() => handleSelectRepeat('daily')} />
            <SheetOption label="Weekly" onPress={() => handleSelectRepeat('weekly')} />
            <SheetOption label="Weekdays" onPress={() => handleSelectRepeat('weekdays')} />
            <SheetOption label="Monthly" onPress={() => handleSelectRepeat('monthly')} />
            <SheetOption label="Yearly" onPress={() => handleSelectRepeat('yearly')} />
          </VStack>
        </View>
      </BottomDrawer>
    </AppShell>
  );
}

type SheetOptionProps = {
  label: string;
  onPress: () => void;
};

function SheetOption({ label, onPress }: SheetOptionProps) {
  return (
    <Pressable style={styles.sheetRow} onPress={onPress}>
      <Text style={styles.sheetRowLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: {
    paddingVertical: spacing.sm,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.md,
    flexWrap: 'wrap',
  },
  titlePressable: {
    flex: 1,
    flexShrink: 1,
  },
  titleText: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  titleInput: {
    ...typography.titleSm,
    color: colors.textPrimary,
    padding: 0,
    flexShrink: 1,
  },
  metaText: {
    marginTop: spacing.sm,
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxPlanned: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  checkboxCompleted: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    backgroundColor: colors.shellAlt,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  rowLabelActive: {
    color: colors.accent,
  },
  rowContent: {
    // Slightly taller than default row height without feeling oversized.
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowsCard: {
    borderRadius: 20,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  notesLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notesInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
    paddingVertical: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionLabelRow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  stepsHeaderRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepsHeaderLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  addStepButtonText: {
    ...typography.label,
    color: colors.primaryForeground,
  },
  stepsEmpty: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stepRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs / 2,
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
  },
  stepInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.textPrimary,
    paddingVertical: spacing.xs / 2,
  },
  stepOptionalPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.shell,
  },
  stepOptionalText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  stepOptionalTextActive: {
    color: colors.accent,
  },
  removeStepButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
  },
  addStepInlineRow: {
    marginTop: spacing.xs,
  },
  addStepInlineText: {
    ...typography.bodySm,
    color: colors.primary,
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  rowRight: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
  },
  rowValueAi: {
    color: colors.accent,
  },
  planningHeader: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetRow: {
    paddingVertical: spacing.sm,
  },
  sheetRowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  datePickerContainer: {
    marginTop: spacing.sm,
  },
  sectionDivider: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  objectTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  objectTypeLabel: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    width: 36,
    height: 36,
  },
  optionsButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    width: 36,
    height: 36,
  },
  destructiveMenuRowText: {
    ...typography.body,
    color: colors.destructive,
  },
});


