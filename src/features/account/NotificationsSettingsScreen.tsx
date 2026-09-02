import { useCallback, useMemo, useState } from 'react';
import { Alert, AppState, StyleSheet, View, Platform } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { colors, spacing } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { Text, VStack } from '../../ui/primitives';
import { SmallSetPickerField } from '../../ui/PickerFields';
import {
  SettingsDivider,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  SettingsToggleRow,
} from '../../ui/SettingsSurface';
import { NotificationService } from '../../services/NotificationService';
import { LocationPermissionService } from '../../services/LocationPermissionService';
import { createMealPlanAttentionRepository } from '../../capabilities/meal-planning/data/mealPlanAttentionRepository';
import {
  DEFAULT_DAILY_FOCUS_TIME,
  DEFAULT_DAILY_SHOW_UP_TIME,
  DEFAULT_GOAL_NUDGE_TIME,
} from '../../services/notifications/defaultTimes';
import { buildNotificationPreferenceReview } from '../../capabilities/notifications/actions/notificationPreferenceActions';

type NotificationsSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsNotifications'
>;

type PlanKickoffCadence = 'daily' | 'weekdays' | 'weekly';

const PLAN_KICKOFF_CADENCE_OPTIONS: Array<{
  value: PlanKickoffCadence;
  label: string;
}> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
];

const WEEKDAY_OPTIONS: Array<{
  value: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
}> = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

type TimePickerTarget = 'dailyShowUp' | 'dailyFocus' | 'goalNudge';

export function NotificationsSettingsScreen() {
  const navigation = useNavigation<NotificationsSettingsNavigationProp>();
  const route =
    useRoute<RouteProp<SettingsStackParamList, 'SettingsNotifications'>>();
  const preferences = useAppStore((state) => state.notificationPreferences);
  const setPreferences = useAppStore(
    (state) => state.setNotificationPreferences,
  );
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const locationOfferPreferences = useAppStore(
    (state) => state.locationOfferPreferences,
  );
  const setLocationOfferPreferences = useAppStore(
    (state) => state.setLocationOfferPreferences,
  );
  const [timePickerTarget, setTimePickerTarget] =
    useState<TimePickerTarget | null>(null);
  const [timePickerDraft, setTimePickerDraft] = useState<Date>(
    () => new Date(),
  );
  const requestedReview = useMemo(() => {
    if (!route.params?.fields) return null;
    try {
      return buildNotificationPreferenceReview(
        preferences,
        route.params.fields,
      );
    } catch {
      return null;
    }
  }, [preferences, route.params?.fields]);

  const applyRequestedReview = useCallback(async () => {
    if (!requestedReview) return;
    if (requestedReview.requiresNativePermission) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('activity');
      if (!granted) return;
      requestedReview.next.osPermissionStatus = 'authorized';
    }
    const prior = preferences;
    await NotificationService.applySettings(requestedReview.next);
    if (
      userId &&
      requestedReview.changedFields.includes('allowHouseholdMealPlanPush')
    ) {
      try {
        await createMealPlanAttentionRepository().setPushEnabled(
          requestedReview.next.allowHouseholdMealPlanPush !== false,
        );
      } catch {
        await NotificationService.applySettings(prior);
        Alert.alert(
          'Preference not saved',
          'Check your connection and try again.',
        );
        return;
      }
    }
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation, preferences, requestedReview, userId]);

  const formatTimeLabel = (timeHHmm: string) => {
    const [hourString, minuteString] = timeHHmm.split(':');
    const hour = Number.parseInt(hourString ?? '8', 10);
    const minute = Number.parseInt(minuteString ?? '0', 10);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const dailyShowUpTimeLabel = useMemo(() => {
    return formatTimeLabel(
      preferences.dailyShowUpTime ?? DEFAULT_DAILY_SHOW_UP_TIME,
    );
  }, [preferences.dailyShowUpTime]);

  const dailyFocusTimeLabel = useMemo(() => {
    return formatTimeLabel(
      preferences.dailyFocusTime ?? DEFAULT_DAILY_FOCUS_TIME,
    );
  }, [preferences.dailyFocusTime]);

  const goalNudgeTimeLabel = useMemo(() => {
    const raw = (preferences as any).goalNudgeTime as string | null | undefined;
    return formatTimeLabel(raw ?? DEFAULT_GOAL_NUDGE_TIME);
  }, [(preferences as any).goalNudgeTime]);

  const planKickoffCadence: PlanKickoffCadence = useMemo(() => {
    if (
      preferences.planKickoffCadence === 'daily' ||
      preferences.planKickoffCadence === 'weekdays' ||
      preferences.planKickoffCadence === 'weekly'
    ) {
      return preferences.planKickoffCadence;
    }
    return 'daily';
  }, [preferences.planKickoffCadence]);

  const planKickoffWeeklyDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 = useMemo(() => {
    const raw = preferences.planKickoffWeeklyDay;
    if (
      typeof raw === 'number' &&
      Number.isFinite(raw) &&
      raw >= 0 &&
      raw <= 6
    ) {
      return raw as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }
    return 1;
  }, [preferences.planKickoffWeeklyDay]);

  const planKickoffWeeklyDayLabel = useMemo(() => {
    return (
      WEEKDAY_OPTIONS.find((option) => option.value === planKickoffWeeklyDay)
        ?.label ?? 'Monday'
    );
  }, [planKickoffWeeklyDay]);

  const osStatusLabel = useMemo(() => {
    switch (preferences.osPermissionStatus) {
      case 'authorized':
        return 'Allowed in system settings';
      case 'denied':
      case 'restricted':
        return 'Blocked in system settings';
      case 'notRequested':
      default:
        return 'Not requested yet';
    }
  }, [preferences.osPermissionStatus]);

  const locationOsStatusLabel = useMemo(() => {
    switch (locationOfferPreferences.osPermissionStatus) {
      case 'authorized':
        return 'Allowed in system settings';
      case 'foregroundOnly':
        return 'Allow Always in system settings';
      case 'denied':
      case 'restricted':
        return 'Blocked in system settings';
      case 'unavailable':
        return 'Not available in this build';
      case 'notRequested':
      default:
        return 'Not requested yet';
    }
  }, [locationOfferPreferences.osPermissionStatus]);

  const remindersEnabled = preferences.notificationsEnabled;
  const activityRemindersEnabled =
    remindersEnabled && preferences.allowActivityReminders;
  const dailyShowUpEnabled = remindersEnabled && preferences.allowDailyShowUp;
  const dailyFocusEnabled = remindersEnabled && preferences.allowDailyFocus;
  const goalNudgesEnabled = remindersEnabled && preferences.allowGoalNudges;
  const streakAndReactivationEnabled =
    remindersEnabled && preferences.allowStreakAndReactivation;
  const householdMealPlanningEnabled =
    remindersEnabled && preferences.allowHouseholdMealPlanPush !== false;
  const locationPromptsEnabled = Boolean(locationOfferPreferences.enabled);
  const planKickoffEnabled = preferences.allowPlanKickoff !== false;

  const planKickoffSummary = useMemo(() => {
    if (!planKickoffEnabled) return 'Off';
    if (planKickoffCadence === 'weekdays') return 'Weekdays';
    if (planKickoffCadence === 'weekly')
      return `Weekly · ${planKickoffWeeklyDayLabel}`;
    return 'Daily';
  }, [planKickoffCadence, planKickoffEnabled, planKickoffWeeklyDayLabel]);

  const syncPermissionLabels = useCallback(() => {
    void NotificationService.syncOsPermissionStatus();
    void LocationPermissionService.syncOsPermissionStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Keep system permission labels fresh when this screen gains focus.
      syncPermissionLabels();
      const sub = AppState.addEventListener('change', (nextState) => {
        if (nextState !== 'active') return;
        syncPermissionLabels();
      });
      if (userId) {
        void createMealPlanAttentionRepository()
          .getPushEnabled()
          .then((enabled) => {
            setPreferences((current) => ({
              ...current,
              allowHouseholdMealPlanPush: enabled,
            }));
          })
          .catch(() => undefined);
      }
      return () => sub.remove();
    }, [setPreferences, syncPermissionLabels, userId]),
  );

  const handleToggleGlobal = async () => {
    const turningOn = !preferences.notificationsEnabled;
    if (turningOn) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('activity');
      if (!granted) {
        return;
      }
    }
    const next = {
      ...preferences,
      notificationsEnabled: !preferences.notificationsEnabled,
      // When turning everything off, also implicitly turn off categories.
      allowActivityReminders: turningOn ? true : false,
      allowHouseholdMealPlanPush: turningOn
        ? preferences.allowHouseholdMealPlanPush !== false
        : false,
    };
    await NotificationService.applySettings(next);
    if (!userId) return;
    try {
      await createMealPlanAttentionRepository().setPushEnabled(
        next.allowHouseholdMealPlanPush,
      );
    } catch {
      await NotificationService.applySettings(preferences);
      Alert.alert(
        'Preference not saved',
        'Check your connection and try again.',
      );
    }
  };

  const handleToggleLocationOffers = async () => {
    const currentlyEnabled = Boolean(locationOfferPreferences.enabled);
    const nextEnabled = !currentlyEnabled;
    if (!nextEnabled) {
      setLocationOfferPreferences((current) => ({
        ...current,
        enabled: false,
      }));
      return;
    }

    // If turning on, only persist enabled when "Always" access is actually granted.
    await LocationPermissionService.ensurePermissionWithRationale(
      'location_offers',
    );
    const nextStatus =
      await LocationPermissionService.syncOsPermissionStatus().catch(
        () => 'unavailable',
      );
    if (nextStatus === 'unavailable') {
      Alert.alert(
        'Location not available',
        'Location services aren’t available in this build. Use a development build (or update/reinstall) and try again.',
      );
    }
    setLocationOfferPreferences((current) => ({
      ...current,
      enabled: nextStatus === 'authorized',
    }));
  };

  const handleToggleActivityReminders = async () => {
    if (!preferences.notificationsEnabled) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('activity');
      if (!granted) {
        return;
      }
      // Ensure global is on when enabling a specific category.
      const next = {
        ...preferences,
        notificationsEnabled: true,
        allowActivityReminders: true,
      };
      await NotificationService.applySettings(next);
      return;
    }

    const next = {
      ...preferences,
      allowActivityReminders: !preferences.allowActivityReminders,
    };
    await NotificationService.applySettings(next);
  };

  const handleToggleDailyShowUp = async () => {
    if (!preferences.notificationsEnabled || !preferences.allowDailyShowUp) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('daily');
      if (!granted) {
        return;
      }
    }
    const nextAllow = !preferences.allowDailyShowUp;
    const nextTime = preferences.dailyShowUpTime ?? DEFAULT_DAILY_SHOW_UP_TIME;
    const next = {
      ...preferences,
      notificationsEnabled: true,
      allowDailyShowUp: nextAllow,
      dailyShowUpTime: nextTime,
    };
    await NotificationService.applySettings(next);
  };

  const handleToggleDailyFocus = async () => {
    if (!preferences.notificationsEnabled || !preferences.allowDailyFocus) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('daily');
      if (!granted) {
        return;
      }
    }
    const nextAllow = !preferences.allowDailyFocus;
    const nextTime = preferences.dailyFocusTime ?? DEFAULT_DAILY_FOCUS_TIME;
    const next = {
      ...preferences,
      notificationsEnabled: true,
      allowDailyFocus: nextAllow,
      dailyFocusTime: nextTime,
      dailyFocusTimeMode: preferences.dailyFocusTimeMode ?? 'auto',
    };
    await NotificationService.applySettings(next);
  };

  const handleToggleGoalNudges = async () => {
    if (!preferences.notificationsEnabled || !preferences.allowGoalNudges) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('daily');
      if (!granted) {
        return;
      }
    }
    const nextTime =
      (preferences as any).goalNudgeTime ?? DEFAULT_GOAL_NUDGE_TIME;
    const next = {
      ...preferences,
      notificationsEnabled: true,
      allowGoalNudges: !preferences.allowGoalNudges,
      goalNudgeTime: nextTime,
    };
    await NotificationService.applySettings(next);
  };

  const handleToggleStreakAndReactivation = async () => {
    if (
      !preferences.notificationsEnabled ||
      !preferences.allowStreakAndReactivation
    ) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('daily');
      if (!granted) {
        return;
      }
    }
    const next = {
      ...preferences,
      notificationsEnabled: true,
      allowStreakAndReactivation: !preferences.allowStreakAndReactivation,
    };
    await NotificationService.applySettings(next);
  };

  const handleToggleHouseholdMealPlanning = async () => {
    const nextEnabled = !householdMealPlanningEnabled;
    if (nextEnabled && !preferences.notificationsEnabled) {
      const granted =
        await NotificationService.ensurePermissionWithRationale('activity');
      if (!granted) return;
    }
    const next = {
      ...preferences,
      notificationsEnabled: nextEnabled
        ? true
        : preferences.notificationsEnabled,
      allowHouseholdMealPlanPush: nextEnabled,
    };
    await NotificationService.applySettings(next);
    if (!userId) return;
    try {
      await createMealPlanAttentionRepository().setPushEnabled(nextEnabled);
    } catch {
      await NotificationService.applySettings(preferences);
      Alert.alert(
        'Preference not saved',
        'Check your connection and try again.',
      );
    }
  };

  const handleTogglePlanKickoff = () => {
    setPreferences((current) => ({
      ...current,
      allowPlanKickoff: !current.allowPlanKickoff,
      planKickoffCadence:
        current.planKickoffCadence === 'daily' ||
        current.planKickoffCadence === 'weekdays' ||
        current.planKickoffCadence === 'weekly'
          ? current.planKickoffCadence
          : 'daily',
      planKickoffWeeklyDay:
        typeof current.planKickoffWeeklyDay === 'number' &&
        Number.isFinite(current.planKickoffWeeklyDay) &&
        current.planKickoffWeeklyDay >= 0 &&
        current.planKickoffWeeklyDay <= 6
          ? current.planKickoffWeeklyDay
          : 1,
    }));
  };

  const handleSetPlanKickoffCadence = (cadence: PlanKickoffCadence) => {
    setPreferences((current) => ({
      ...current,
      allowPlanKickoff: true,
      planKickoffCadence: cadence,
      planKickoffWeeklyDay:
        typeof current.planKickoffWeeklyDay === 'number' &&
        Number.isFinite(current.planKickoffWeeklyDay) &&
        current.planKickoffWeeklyDay >= 0 &&
        current.planKickoffWeeklyDay <= 6
          ? current.planKickoffWeeklyDay
          : 1,
    }));
  };

  const handleSetPlanKickoffWeeklyDay = (
    weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  ) => {
    setPreferences((current) => ({
      ...current,
      allowPlanKickoff: true,
      planKickoffCadence: 'weekly',
      planKickoffWeeklyDay: weekday,
    }));
  };

  const getPickerDateForTarget = (target: TimePickerTarget) => {
    const raw =
      target === 'dailyFocus'
        ? preferences.dailyFocusTime
        : target === 'goalNudge'
          ? ((preferences as any).goalNudgeTime as string | null | undefined)
          : preferences.dailyShowUpTime;
    if (raw) {
      const [hourString, minuteString] = raw.split(':');
      const hour = Number.parseInt(hourString ?? '8', 10);
      const minute = Number.parseInt(minuteString ?? '0', 10);
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return date;
    }
    const fallback =
      target === 'dailyFocus'
        ? DEFAULT_DAILY_FOCUS_TIME
        : target === 'goalNudge'
          ? DEFAULT_GOAL_NUDGE_TIME
          : DEFAULT_DAILY_SHOW_UP_TIME;
    const date = new Date();
    const [h, m] = fallback.split(':');
    date.setHours(
      Number.parseInt(h ?? '8', 10),
      Number.parseInt(m ?? '0', 10),
      0,
      0,
    );
    return date;
  };

  const openTimePicker = (target: TimePickerTarget) => {
    setTimePickerTarget(target);
    setTimePickerDraft(getPickerDateForTarget(target));
  };

  const closeTimePicker = () => {
    setTimePickerTarget(null);
  };

  const timePickerTitle = useMemo(() => {
    if (timePickerTarget === 'dailyFocus') return 'Daily focus time';
    if (timePickerTarget === 'goalNudge') return 'Goal nudges time';
    return 'Daily show-up time';
  }, [timePickerTarget]);

  const applyTimePickerDate = async (
    target: TimePickerTarget,
    date: Date,
    closeAfterSave = false,
  ) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    const next =
      target === 'dailyFocus'
        ? {
            ...preferences,
            notificationsEnabled: true,
            allowDailyFocus: true,
            dailyFocusTime: time,
            dailyFocusTimeMode: 'manual' as const,
          }
        : target === 'goalNudge'
          ? {
              ...preferences,
              notificationsEnabled: true,
              allowGoalNudges: true,
              goalNudgeTime: time,
            }
          : {
              ...preferences,
              notificationsEnabled: true,
              allowDailyShowUp: true,
              dailyShowUpTime: time,
            };
    await NotificationService.applySettings(next);
    if (closeAfterSave) {
      closeTimePicker();
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (!date || event.type === 'dismissed') {
      if (Platform.OS !== 'ios') {
        closeTimePicker();
      }
      return;
    }
    setTimePickerDraft(date);
    if (timePickerTarget) {
      void applyTimePickerDate(timePickerTarget, date);
    }
  };

  const handleSaveTimePicker = async () => {
    if (!timePickerTarget) return;
    await applyTimePickerDate(timePickerTarget, timePickerDraft, true);
  };

  const handleNavigateBack = () => {
    navigation.goBack();
  };

  return (
    <SettingsPage title="Notifications" onBack={handleNavigateBack}>
      {requestedReview ? (
        <SettingsGroup title="Review chat request">
          <VStack space="md" style={styles.reviewContent}>
            <Text style={styles.supportingText}>
              {requestedReview.changedFields.length} notification setting
              {requestedReview.changedFields.length === 1 ? '' : 's'} will
              change.
              {requestedReview.requiresNativePermission
                ? ' iOS will ask for permission after you continue.'
                : ''}
            </Text>
            <Button
              label="Apply these changes"
              onPress={() => {
                void applyRequestedReview();
              }}
            />
          </VStack>
        </SettingsGroup>
      ) : null}

      <SettingsGroup title="Permission">
        <SettingsToggleRow
          title="Notifications from Kwilt"
          description={osStatusLabel}
          enabled={preferences.notificationsEnabled}
          onPress={() => {
            void handleToggleGlobal();
          }}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Reminders"
        footer="Choose only the reminders that help you follow through. You can change these anytime."
      >
        <SettingsToggleRow
          title="To-do reminders"
          description="Reminders you set for individual to-dos"
          enabled={activityRemindersEnabled}
          onPress={() => {
            void handleToggleActivityReminders();
          }}
        />
        <SettingsDivider />
        <SettingsToggleRow
          title="Household meal planning"
          description="When there are new meal ideas to weigh in on"
          enabled={householdMealPlanningEnabled}
          onPress={() => {
            void handleToggleHouseholdMealPlanning();
          }}
        />
        <SettingsDivider />
        <SettingsToggleRow
          title="Daily show-up"
          description={
            dailyShowUpEnabled
              ? `Every day at ${dailyShowUpTimeLabel}`
              : 'A gentle invitation to return to your day'
          }
          enabled={dailyShowUpEnabled}
          onPress={() => {
            void handleToggleDailyShowUp();
          }}
        />
        {dailyShowUpEnabled ? (
          <>
            <SettingsDivider />
            <SettingsRow
              title="Daily show-up time"
              value={dailyShowUpTimeLabel}
              onPress={() => openTimePicker('dailyShowUp')}
            />
          </>
        ) : null}
        <SettingsDivider />
        <SettingsToggleRow
          title="Daily focus"
          description={
            dailyFocusEnabled
              ? `Every day at ${dailyFocusTimeLabel}`
              : 'A prompt to protect time for what matters'
          }
          enabled={dailyFocusEnabled}
          onPress={() => {
            void handleToggleDailyFocus();
          }}
        />
        {dailyFocusEnabled ? (
          <>
            <SettingsDivider />
            <SettingsRow
              title="Daily focus time"
              value={dailyFocusTimeLabel}
              onPress={() => openTimePicker('dailyFocus')}
            />
          </>
        ) : null}
        <SettingsDivider />
        <SettingsToggleRow
          title="Goal nudges"
          description={
            goalNudgesEnabled
              ? `Every day at ${goalNudgeTimeLabel}`
              : 'A tiny next step for an active goal'
          }
          enabled={goalNudgesEnabled}
          onPress={() => {
            void handleToggleGoalNudges();
          }}
        />
        {goalNudgesEnabled ? (
          <>
            <SettingsDivider />
            <SettingsRow
              title="Goal nudge time"
              value={goalNudgeTimeLabel}
              onPress={() => openTimePicker('goalNudge')}
            />
          </>
        ) : null}
        <SettingsDivider />
        <SettingsToggleRow
          title="Streak & comeback"
          description="Gentle support for keeping momentum or starting again"
          enabled={streakAndReactivationEnabled}
          onPress={() => {
            void handleToggleStreakAndReactivation();
          }}
        />
      </SettingsGroup>

      <SettingsGroup
        title="In-app prompts"
        footer="Plan your day prompts appear inside Kwilt, not as push notifications."
      >
        <SettingsToggleRow
          title="Plan your day prompts"
          description={planKickoffSummary}
          enabled={planKickoffEnabled}
          onPress={handleTogglePlanKickoff}
        />
        {planKickoffEnabled ? (
          <>
            <SettingsDivider />
            <SmallSetPickerField
              title="Prompt frequency"
              placeholder="Choose a frequency"
              accessibilityLabel="Plan your day prompt frequency"
              allowDeselect={false}
              options={PLAN_KICKOFF_CADENCE_OPTIONS}
              value={planKickoffCadence}
              onValueChange={(value) =>
                handleSetPlanKickoffCadence(value as PlanKickoffCadence)
              }
              renderTrigger={({ selectedLabel, onPress }) => (
                <SettingsRow
                  title="Frequency"
                  value={selectedLabel}
                  onPress={onPress}
                />
              )}
            />
            {planKickoffCadence === 'weekly' ? (
              <>
                <SettingsDivider />
                <SmallSetPickerField
                  title="Prompt day"
                  placeholder="Choose a day"
                  accessibilityLabel="Weekly plan prompt day"
                  allowDeselect={false}
                  options={WEEKDAY_OPTIONS.map((option) => ({
                    value: String(option.value),
                    label: option.label,
                  }))}
                  value={String(planKickoffWeeklyDay)}
                  onValueChange={(value) =>
                    handleSetPlanKickoffWeeklyDay(
                      Number(value) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                    )
                  }
                  renderTrigger={({ selectedLabel, onPress }) => (
                    <SettingsRow
                      title="Day"
                      value={selectedLabel}
                      onPress={onPress}
                    />
                  )}
                />
              </>
            ) : null}
          </>
        ) : null}
        <SettingsDivider />
        <SettingsToggleRow
          title="Location prompts"
          description={
            locationPromptsEnabled
              ? locationOsStatusLabel
              : 'Suggestions that depend on where you are'
          }
          enabled={locationPromptsEnabled}
          onPress={() => {
            void handleToggleLocationOffers();
          }}
        />
      </SettingsGroup>

      <SettingsGroup title="Email">
        <SettingsRow
          title="Weekly Chapters"
          value="Manage"
          onPress={() => {
            (navigation as any).navigate('SettingsWeeklyChapters');
          }}
        />
      </SettingsGroup>

      <BottomDrawer
        visible={timePickerTarget !== null}
        onClose={closeTimePicker}
        snapPoints={Platform.OS === 'ios' ? ['48%'] : ['42%']}
        keyboardAvoidanceEnabled={false}
        dynamicSizing
      >
        <BottomDrawerHeader
          title={timePickerTitle}
          variant="navbar"
          leftAction={
            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel={`Cancel ${timePickerTitle.toLowerCase()}`}
              onPress={closeTimePicker}
            >
              Cancel
            </Button>
          }
          rightAction={
            <Button
              variant="link"
              size="sm"
              accessibilityLabel={`Save ${timePickerTitle.toLowerCase()}`}
              onPress={() => void handleSaveTimePicker()}
            >
              Done
            </Button>
          }
        />
        <VStack space="md" style={styles.timePickerSheetContent}>
          <Text style={styles.helperText}>
            Choose when this reminder should appear.
          </Text>
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={timePickerDraft}
              onChange={handleTimeChange}
            />
          </View>
        </VStack>
      </BottomDrawer>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  reviewContent: {
    padding: spacing.md,
  },
  supportingText: {
    color: colors.textSecondary,
  },
  helperText: {
    color: colors.textSecondary,
  },
  timePickerContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  timePickerSheetContent: {
    paddingBottom: spacing.lg,
  },
});
