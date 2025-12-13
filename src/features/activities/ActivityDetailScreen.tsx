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
  Keyboard,
} from 'react-native';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { ActivityDifficulty, ActivityStatus, ActivityStep } from '../../domain/types';
import type {
  ActivitiesStackParamList,
  ActivityDetailRouteParams,
} from '../../navigation/RootNavigator';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { VStack, HStack, Input, Textarea, ThreeColumnRow, Combobox } from '../../ui/primitives';
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

  const goalOptions = useMemo(
    () =>
      goals
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((g) => ({ value: g.id, label: g.title })),
    [goals],
  );

  const difficultyOptions = useMemo(
    () => [
      { value: 'very_easy', label: 'Very easy' },
      { value: 'easy', label: 'Easy' },
      { value: 'medium', label: 'Medium' },
      { value: 'hard', label: 'Hard' },
      { value: 'very_hard', label: 'Very hard' },
    ],
    [],
  );

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputFocusCountRef = useRef(0);
  const [isAnyInputFocused, setIsAnyInputFocused] = useState(false);
  const [goalComboboxOpen, setGoalComboboxOpen] = useState(false);
  const [difficultyComboboxOpen, setDifficultyComboboxOpen] = useState(false);
  const [estimateSheetVisible, setEstimateSheetVisible] = useState(false);
  const [estimateHoursDraft, setEstimateHoursDraft] = useState('0');
  const [estimateMinutesDraft, setEstimateMinutesDraft] = useState('0');

  const handleBackToActivities = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('ActivitiesList');
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  const showDoneButton = isKeyboardVisible || isAnyInputFocused || isEditingTitle || isAddingStepInline;

  const handleDoneEditing = () => {
    // Prefer blurring the known inline inputs first so their onBlur commits fire.
    titleInputRef.current?.blur();
    newStepInputRef.current?.blur();
    Keyboard.dismiss();
  };

  const handleAnyInputFocus = () => {
    inputFocusCountRef.current += 1;
    if (!isAnyInputFocused) setIsAnyInputFocused(true);
  };

  const handleAnyInputBlur = () => {
    inputFocusCountRef.current = Math.max(0, inputFocusCountRef.current - 1);
    if (inputFocusCountRef.current === 0) setIsAnyInputFocused(false);
  };

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

  const handleClearReminder = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      reminderAt: null,
      updatedAt: timestamp,
    }));
    setReminderSheetVisible(false);
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

  const handleClearRepeatRule = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      repeatRule: undefined,
      updatedAt: timestamp,
    }));
    setRepeatSheetVisible(false);
  };

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

  const hasTimeEstimate =
    activity.estimateMinutes != null || activity.aiPlanning?.estimateMinutes != null;
  const hasDifficulty = activity.difficulty != null || activity.aiPlanning?.difficulty != null;

  const handleClearTimeEstimate = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => {
      // Prefer clearing the user-controlled canonical estimate first.
      if (prev.estimateMinutes != null) {
        return { ...prev, estimateMinutes: undefined, updatedAt: timestamp };
      }
      // Otherwise clear the AI suggestion (so the label can return to the empty state).
      if (prev.aiPlanning?.estimateMinutes != null) {
        return {
          ...prev,
          aiPlanning: { ...prev.aiPlanning, estimateMinutes: null },
          updatedAt: timestamp,
        };
      }
      return { ...prev, updatedAt: timestamp };
    });
  };

  const handleClearDifficulty = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => {
      if (prev.difficulty != null) {
        return { ...prev, difficulty: undefined, updatedAt: timestamp };
      }
      if (prev.aiPlanning?.difficulty != null) {
        const nextAi = { ...prev.aiPlanning };
        delete nextAi.difficulty;
        return { ...prev, aiPlanning: nextAi, updatedAt: timestamp };
      }
      return { ...prev, updatedAt: timestamp };
    });
  };

  const openEstimateSheet = () => {
    const minutes = activity.estimateMinutes ?? activity.aiPlanning?.estimateMinutes ?? 0;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    setEstimateHoursDraft(String(hrs));
    setEstimateMinutesDraft(String(mins));
    setEstimateSheetVisible(true);
  };

  const commitEstimateDraft = () => {
    const hours = Math.max(0, Number.parseInt(estimateHoursDraft || '0', 10) || 0);
    const minutes = Math.max(0, Number.parseInt(estimateMinutesDraft || '0', 10) || 0);
    const total = hours * 60 + minutes;
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => ({
      ...prev,
      estimateMinutes: total > 0 ? total : undefined,
      updatedAt: timestamp,
    }));
    setEstimateSheetVisible(false);
  };

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
              {showDoneButton ? (
                <Pressable
                  onPress={handleDoneEditing}
                  accessibilityRole="button"
                  accessibilityLabel="Done editing"
                  hitSlop={8}
                  style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              ) : (
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
              )}
            </View>
          </HStack>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title + Steps bundle (task-style, no enclosing card) */}
            <View style={styles.section}>
              <View style={styles.titleStepsBundle}>
                <ThreeColumnRow
                  style={styles.titleRow}
                  contentStyle={styles.titleRowContent}
                  left={
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
                  }
                  right={null}
                >
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
                        onFocus={handleAnyInputFocus}
                        onBlur={() => {
                          handleAnyInputBlur();
                          commitTitle();
                        }}
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
                </ThreeColumnRow>

                {/* No divider between title and steps; treat as one continuous bundle. */}

                {stepsDraft.length === 0 ? null : (
                  <VStack space="xs">
                    {stepsDraft.map((step) => {
                      const isChecked = !!step.completedAt;
                      return (
                        <View key={step.id}>
                          <ThreeColumnRow
                            style={styles.stepRow}
                            contentStyle={styles.stepRowContent}
                            left={
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
                            }
                            right={
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    iconButtonSize={24}
                                    accessibilityLabel="Step actions"
                                    style={styles.removeStepButton}
                                  >
                                    <Icon name="more" size={16} color={colors.textSecondary} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="bottom" sideOffset={6} align="end">
                                  <DropdownMenuItem
                                    onPress={() => handleRemoveStep(step.id)}
                                    variant="destructive"
                                  >
                                    <Text style={styles.destructiveMenuRowText}>Delete step</Text>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            }
                          >
                            <Input
                              value={step.title}
                              onChangeText={(text) => handleChangeStepTitle(step.id, text)}
                              onFocus={handleAnyInputFocus}
                              onBlur={handleAnyInputBlur}
                              placeholder="Describe the step"
                              size="sm"
                              variant="inline"
                              multiline={false}
                              blurOnSubmit
                              returnKeyType="done"
                            />
                          </ThreeColumnRow>
                        </View>
                      );
                    })}
                  </VStack>
                )}

                <ThreeColumnRow
                  left={<Icon name="plus" size={16} color={colors.accent} />}
                  right={null}
                  onPress={beginAddStepInline}
                  accessibilityLabel="Add a step to this activity"
                  style={styles.addStepRow}
                >
                  {isAddingStepInline ? (
                    <Input
                      ref={newStepInputRef}
                      value={newStepTitle}
                      onChangeText={setNewStepTitle}
                      onFocus={handleAnyInputFocus}
                      placeholder="Add step"
                      size="sm"
                      variant="inline"
                      multiline={false}
                      blurOnSubmit
                      returnKeyType="done"
                      onSubmitEditing={commitInlineStep}
                      onBlur={() => {
                        handleAnyInputBlur();
                        commitInlineStep();
                      }}
                    />
                  ) : (
                    <Text style={styles.addStepInlineText}>Add step</Text>
                  )}
                </ThreeColumnRow>
              </View>
            </View>

            {/* Linked goal */}
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Linked Goal</Text>
              <Combobox
                open={goalComboboxOpen}
                onOpenChange={setGoalComboboxOpen}
                value={activity.goalId ?? ''}
                onValueChange={(nextGoalId) => {
                  const timestamp = new Date().toISOString();
                  updateActivity(activity.id, (prev) => ({
                    ...prev,
                    goalId: nextGoalId ? nextGoalId : null,
                    updatedAt: timestamp,
                  }));
                }}
                options={goalOptions}
                title="Select goal…"
                searchPlaceholder="Search goals…"
                emptyText="No goals found."
                allowDeselect
                trigger={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change linked goal"
                    onPress={() => setGoalComboboxOpen(true)}
                    style={styles.comboboxTrigger}
                  >
                    <View pointerEvents="none">
                      <Input
                        value={goalTitle ?? ''}
                        placeholder="Select goal…"
                        editable={false}
                        variant="outline"
                        elevation="flat"
                        trailingIcon="chevronsUpDown"
                        containerStyle={styles.comboboxValueContainer}
                        inputStyle={styles.comboboxValueInput}
                      />
                    </View>
                  </Pressable>
                }
              />
            </View>

            {/* 3) Reminder / Due date / Recurrence */}
            <View style={styles.section}>
              <View style={styles.rowsCard}>
                <View style={styles.rowPadding}>
                  <VStack space="xs">
                  {/* Timing */}
                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setReminderSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit reminder"
                    >
                      <ThreeColumnRow
                        left={<Icon name="bell" size={16} color={colors.textSecondary} />}
                        right={
                          activity.reminderAt ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearReminder();
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Clear reminder"
                              hitSlop={8}
                            >
                              <Icon name="close" size={16} color={colors.textSecondary} />
                            </Pressable>
                          ) : null
                        }
                      >
                        <Text
                          style={[
                            styles.rowValue,
                            reminderLabel !== 'None' && styles.rowLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {reminderLabel === 'None' ? 'Add reminder' : reminderLabel}
                        </Text>
                      </ThreeColumnRow>
                    </Pressable>
                  </VStack>

                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setDueDateSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit due date"
                    >
                      <ThreeColumnRow
                        left={<Icon name="today" size={16} color={colors.textSecondary} />}
                        right={
                          activity.scheduledDate ? (
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
                          ) : null
                        }
                      >
                        <Text
                          style={[
                            styles.rowValue,
                            activity.scheduledDate && styles.rowLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {activity.scheduledDate ? dueDateLabel : 'Add due date'}
                        </Text>
                      </ThreeColumnRow>
                    </Pressable>
                  </VStack>

                  <VStack space="sm">
                    <Pressable
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      onPress={() => setRepeatSheetVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Edit repeat schedule"
                    >
                      <ThreeColumnRow
                        left={<Icon name="refresh" size={16} color={colors.textSecondary} />}
                        right={
                          activity.repeatRule ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearRepeatRule();
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Clear repeat schedule"
                              hitSlop={8}
                            >
                              <Icon name="close" size={16} color={colors.textSecondary} />
                            </Pressable>
                          ) : null
                        }
                      >
                        <Text
                          style={[
                            styles.rowValue,
                            repeatLabel !== 'Off' && styles.rowLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {repeatLabel === 'Off' ? 'Repeat' : repeatLabel}
                        </Text>
                      </ThreeColumnRow>
                    </Pressable>
                  </VStack>

                  <View style={styles.cardSectionDivider} />

                  {/* Planning (no group label; treated as part of the same metadata card) */}
                  <View style={styles.row}>
                    <ThreeColumnRow
                      left={<Icon name="estimate" size={16} color={colors.textSecondary} />}
                      right={
                        hasTimeEstimate ? (
                          <Pressable
                            onPress={(event) => {
                              event.stopPropagation();
                              handleClearTimeEstimate();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Clear time estimate"
                            hitSlop={8}
                          >
                            <Icon name="close" size={16} color={colors.textSecondary} />
                          </Pressable>
                        ) : (
                          <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                        )
                      }
                      onPress={openEstimateSheet}
                      accessibilityLabel="Edit time estimate"
                    >
                      <Text
                        style={[
                          styles.rowValue,
                          timeEstimateIsAi && styles.rowValueAi,
                        ]}
                        numberOfLines={1}
                      >
                        {timeEstimateLabel}
                      </Text>
                    </ThreeColumnRow>
                  </View>

                  <Combobox
                    open={difficultyComboboxOpen}
                    onOpenChange={setDifficultyComboboxOpen}
                    value={activity.difficulty ?? ''}
                    onValueChange={(nextDifficulty) => {
                      const timestamp = new Date().toISOString();
                      updateActivity(activity.id, (prev) => ({
                        ...prev,
                        difficulty: (nextDifficulty || undefined) as ActivityDifficulty | undefined,
                        updatedAt: timestamp,
                      }));
                    }}
                    options={difficultyOptions}
                    title="Difficulty"
                    searchPlaceholder="Search difficulty…"
                    emptyText="No difficulty options found."
                    allowDeselect
                    trigger={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit difficulty"
                        onPress={() => setDifficultyComboboxOpen(true)}
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                      >
                        <ThreeColumnRow
                          left={<Icon name="difficulty" size={16} color={colors.textSecondary} />}
                          right={
                            hasDifficulty ? (
                              <Pressable
                                onPress={(event) => {
                                  event.stopPropagation();
                                  handleClearDifficulty();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Clear difficulty estimate"
                                hitSlop={8}
                              >
                                <Icon name="close" size={16} color={colors.textSecondary} />
                              </Pressable>
                            ) : (
                              <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.rowValue,
                              difficultyIsAi && styles.rowValueAi,
                            ]}
                            numberOfLines={1}
                          >
                            {difficultyLabel}
                          </Text>
                        </ThreeColumnRow>
                      </Pressable>
                    }
                  />
                </VStack>
                </View>
              </View>
            </View>

            {/* 5) Notes */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>NOTES</Text>
              <Textarea
                value={notesDraft}
                onChangeText={setNotesDraft}
                onFocus={handleAnyInputFocus}
                onBlur={() => {
                  handleAnyInputBlur();
                  commitNotes();
                }}
                placeholder="Add context or reminders for this activity."
                multiline
                variant="outline"
                elevation="flat"
                // Compact note field vs the larger default textarea spec.
                multilineMinHeight={80}
                multilineMaxHeight={180}
              />
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

      <BottomDrawer
        visible={estimateSheetVisible}
        onClose={() => setEstimateSheetVisible(false)}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Duration</Text>
          <VStack space="md">
            <HStack space="sm" alignItems="center" style={styles.estimateFieldsRow}>
              <View style={styles.estimateField}>
                <Text style={styles.estimateFieldLabel}>Hours</Text>
                <Input
                  value={estimateHoursDraft}
                  onChangeText={setEstimateHoursDraft}
                  placeholder="0"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  size="sm"
                  variant="outline"
                  elevation="flat"
                />
              </View>
              <View style={styles.estimateField}>
                <Text style={styles.estimateFieldLabel}>Minutes</Text>
                <Input
                  value={estimateMinutesDraft}
                  onChangeText={setEstimateMinutesDraft}
                  placeholder="0"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  size="sm"
                  variant="outline"
                  elevation="flat"
                />
              </View>
            </HStack>

            <HStack space="sm">
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  handleClearTimeEstimate();
                  setEstimateSheetVisible(false);
                }}
              >
                <Text style={styles.sheetRowLabel}>Clear</Text>
              </Button>
              <Button variant="primary" style={{ flex: 1 }} onPress={commitEstimateDraft}>
                <Text style={styles.sheetRowLabel}>Save</Text>
              </Button>
            </HStack>
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
    gap: spacing.xs,
  },
  section: {
    paddingVertical: spacing.xs,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: spacing.md,
    flexWrap: 'wrap',
  },
  rowPadding: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  titleStepsBundle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bundleDivider: {
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
    marginVertical: 2,
  },
  titlePressable: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  titleRow: {
    paddingHorizontal: 0,
    minHeight: 44,
  },
  titleRowContent: {
    // Keep the title vertically centered against the (slightly larger) checkbox.
    paddingVertical: spacing.xs,
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
  fieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  comboboxTrigger: {
    width: '100%',
  },
    comboboxValueContainer: {
      // `Input` dims non-editable fields by default. For combobox triggers, we want the
      // selected value to use the standard dark text appearance like other inputs.
      opacity: 1,
    },
    comboboxValueInput: {
      // Improve vertical centering of single-line value text (icon is already centered).
      color: colors.textPrimary,
      paddingVertical: 0,
      // Keep these explicit so we can safely override line metrics.
      fontFamily: typography.bodySm.fontFamily,
      fontSize: typography.bodySm.fontSize,
      // Line-height strongly affects perceived vertical centering.
      lineHeight: Platform.OS === 'ios' ? typography.bodySm.fontSize + 2 : typography.bodySm.lineHeight,
      // Android-only props (harmless on iOS, but not relied upon there).
      includeFontPadding: false,
      textAlignVertical: 'center',
      // iOS: very small baseline nudge upward (text tends to sit slightly low).
      ...(Platform.OS === 'ios' ? { marginTop: -1 } : null),
    },
  metaText: {
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
  cardSectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    borderRadius: 999,
    marginVertical: 2,
  },
  rowsCard: {
    borderRadius: 12,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
  },
  sectionLabelRow: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 2,
  },
  stepsHeaderRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
    paddingVertical: spacing.xs,
  },
  stepRow: {
    // Keep step content vertically centered against the checkbox.
    minHeight: 40,
  },
  stepRowContent: {
    paddingVertical: 0,
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
  },
  stepInput: {
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
  addStepRow: {
    marginTop: 2,
  },
  addStepInlineText: {
    ...typography.bodySm,
    color: colors.accent,
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
  estimateFieldsRow: {
    width: '100%',
  },
  estimateField: {
    flex: 1,
  },
  estimateFieldLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  doneButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  doneButtonPressed: {
    opacity: 0.75,
  },
  doneButtonText: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
  },
});


