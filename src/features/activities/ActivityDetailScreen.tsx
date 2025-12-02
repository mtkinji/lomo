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
} from 'react-native';
import { AppShell } from '../../ui/layout/AppShell';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type {
  ActivitiesStackParamList,
  ActivityDetailRouteParams,
} from '../../navigation/RootNavigator';
import { KwiltBottomSheet } from '../../ui/BottomSheet';
import { VStack, HStack } from '../../ui/primitives';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { useMemo, useRef, useState } from 'react';

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

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(activity?.title ?? '');
  const titleInputRef = useRef<TextInput | null>(null);

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

  const handleToggleComplete = () => {
    const timestamp = new Date().toISOString();
    updateActivity(activity.id, (prev) => {
      const nextIsDone = prev.status !== 'done';
      return {
        ...prev,
        status: nextIsDone ? 'done' : 'planned',
        completedAt: nextIsDone ? timestamp : null,
        updatedAt: timestamp,
      };
    });
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
                <Icon name="arrowLeft" size={20} color={colors.canvas} strokeWidth={2.5} />
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
              <VStack space="sm">
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
              <VStack space="sm">
                <Pressable
                  style={styles.row}
                  onPress={() => setReminderSheetVisible(true)}
                >
                  <Text style={styles.rowLabel}>Remind me</Text>
                  <Text style={styles.rowValue}>{reminderLabel}</Text>
                </Pressable>

                <Pressable
                  style={styles.row}
                  onPress={() => setDueDateSheetVisible(true)}
                >
                  <Text style={styles.rowLabel}>Add due date</Text>
                  <Text style={styles.rowValue}>{dueDateLabel}</Text>
                </Pressable>

                <Pressable
                  style={styles.row}
                  onPress={() => setRepeatSheetVisible(true)}
                >
                  <Text style={styles.rowLabel}>Repeat</Text>
                  <Text style={styles.rowValue}>{repeatLabel}</Text>
                </Pressable>
              </VStack>
            </View>
          </ScrollView>
        </VStack>
      </View>

      <KwiltBottomSheet
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
      </KwiltBottomSheet>

      <KwiltBottomSheet
        visible={dueDateSheetVisible}
        onClose={() => setDueDateSheetVisible(false)}
        snapPoints={['40%']}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Due</Text>
          <VStack space="sm">
            <SheetOption label="Today" onPress={() => handleSelectDueDate(0)} />
            <SheetOption label="Tomorrow" onPress={() => handleSelectDueDate(1)} />
            <SheetOption label="Next Week" onPress={() => handleSelectDueDate(7)} />
          </VStack>
        </View>
      </KwiltBottomSheet>

      <KwiltBottomSheet
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
      </KwiltBottomSheet>
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
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.textSecondary,
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


