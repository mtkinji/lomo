import { useCallback, useMemo, useState } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, View, Pressable, Platform, Switch } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { AppShell } from '../../ui/layout/AppShell';
import { BottomDrawerHeader } from '../../ui/layout/BottomDrawerHeader';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { Button } from '../../ui/Button';
import { HStack, Text, VStack } from '../../ui/primitives';
import { NotificationService } from '../../services/NotificationService';
import { LocationPermissionService } from '../../services/LocationPermissionService';
import {
  DEFAULT_DAILY_FOCUS_TIME,
  DEFAULT_DAILY_SHOW_UP_TIME,
  DEFAULT_GOAL_NUDGE_TIME,
} from '../../services/notifications/defaultTimes';

type NotificationsSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsNotifications'
>;

type PlanKickoffCadence = 'daily' | 'weekdays' | 'weekly';

const PLAN_KICKOFF_CADENCE_OPTIONS: Array<{ value: PlanKickoffCadence; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Weekly' },
];

const WEEKDAY_OPTIONS: Array<{ value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }> = [
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
  const preferences = useAppStore((state) => state.notificationPreferences);
  const setPreferences = useAppStore((state) => state.setNotificationPreferences);
  const locationOfferPreferences = useAppStore((state) => state.locationOfferPreferences);
  const setLocationOfferPreferences = useAppStore((state) => state.setLocationOfferPreferences);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget | null>(null);
  const [timePickerDraft, setTimePickerDraft] = useState<Date>(() => new Date());

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
    return formatTimeLabel(preferences.dailyShowUpTime ?? DEFAULT_DAILY_SHOW_UP_TIME);
  }, [preferences.dailyShowUpTime]);

  const dailyFocusTimeLabel = useMemo(() => {
    return formatTimeLabel(preferences.dailyFocusTime ?? DEFAULT_DAILY_FOCUS_TIME);
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
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 6) {
      return raw as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }
    return 1;
  }, [preferences.planKickoffWeeklyDay]);

  const planKickoffWeeklyDayLabel = useMemo(() => {
    return WEEKDAY_OPTIONS.find((option) => option.value === planKickoffWeeklyDay)?.label ?? 'Monday';
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
  const activityRemindersEnabled = remindersEnabled && preferences.allowActivityReminders;
  const dailyShowUpEnabled = remindersEnabled && preferences.allowDailyShowUp;
  const dailyFocusEnabled = remindersEnabled && preferences.allowDailyFocus;
  const goalNudgesEnabled = remindersEnabled && preferences.allowGoalNudges;
  const streakAndReactivationEnabled = remindersEnabled && preferences.allowStreakAndReactivation;
  const locationPromptsEnabled = Boolean(locationOfferPreferences.enabled);
  const planKickoffEnabled = preferences.allowPlanKickoff !== false;

  const planKickoffSummary = useMemo(() => {
    if (!planKickoffEnabled) return 'Off';
    if (planKickoffCadence === 'weekdays') return 'Weekdays';
    if (planKickoffCadence === 'weekly') return `Weekly · ${planKickoffWeeklyDayLabel}`;
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
      return () => sub.remove();
    }, [syncPermissionLabels]),
  );

  const handleToggleGlobal = async () => {
    if (!preferences.notificationsEnabled) {
      const granted = await NotificationService.ensurePermissionWithRationale('activity');
      if (!granted) {
        return;
      }
    }
    const next = {
      ...preferences,
      notificationsEnabled: !preferences.notificationsEnabled,
      // When turning everything off, also implicitly turn off categories.
      allowActivityReminders: !preferences.notificationsEnabled ? true : false,
    };
    await NotificationService.applySettings(next);
  };

  const handleToggleLocationOffers = async () => {
    const currentlyEnabled = Boolean(locationOfferPreferences.enabled);
    const nextEnabled = !currentlyEnabled;
    if (!nextEnabled) {
      setLocationOfferPreferences((current) => ({ ...current, enabled: false }));
      return;
    }

    // If turning on, only persist enabled when "Always" access is actually granted.
    await LocationPermissionService.ensurePermissionWithRationale('location_offers');
    const nextStatus = await LocationPermissionService.syncOsPermissionStatus().catch(() => 'unavailable');
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
      const granted = await NotificationService.ensurePermissionWithRationale('activity');
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
      const granted = await NotificationService.ensurePermissionWithRationale('daily');
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
      const granted = await NotificationService.ensurePermissionWithRationale('daily');
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
      const granted = await NotificationService.ensurePermissionWithRationale('daily');
      if (!granted) {
        return;
      }
    }
    const nextTime = (preferences as any).goalNudgeTime ?? DEFAULT_GOAL_NUDGE_TIME;
    const next = {
      ...preferences,
      notificationsEnabled: true,
      allowGoalNudges: !preferences.allowGoalNudges,
      goalNudgeTime: nextTime,
    };
    await NotificationService.applySettings(next);
  };

  const handleToggleStreakAndReactivation = async () => {
    if (!preferences.notificationsEnabled || !preferences.allowStreakAndReactivation) {
      const granted = await NotificationService.ensurePermissionWithRationale('daily');
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

  const handleSetPlanKickoffWeeklyDay = (weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
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
    date.setHours(Number.parseInt(h ?? '8', 10), Number.parseInt(m ?? '0', 10), 0, 0);
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

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (!date || event.type === 'dismissed') {
      if (Platform.OS !== 'ios') {
        closeTimePicker();
      }
      return;
    }
    setTimePickerDraft(date);
  };

  const handleSaveTimePicker = async () => {
    if (!timePickerTarget) return;
    const hours = timePickerDraft.getHours().toString().padStart(2, '0');
    const minutes = timePickerDraft.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    const next =
      timePickerTarget === 'dailyFocus'
        ? {
            ...preferences,
            notificationsEnabled: true,
            allowDailyFocus: true,
            dailyFocusTime: time,
            dailyFocusTimeMode: 'manual' as const,
          }
        : timePickerTarget === 'goalNudge'
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
    closeTimePicker();
  };

  const handleNavigateBack = () => {
    navigation.goBack();
  };

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Notifications"
          onPressBack={handleNavigateBack}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.sectionTitle}>Notifications</Text>
              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle notifications from Kwilt"
                  onPress={handleToggleGlobal}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Notifications from Kwilt</Text>
                    <Text style={styles.rowSubtitle}>{osStatusLabel}</Text>
                  </VStack>
                </Pressable>
                <Switch
                  value={preferences.notificationsEnabled}
                  onValueChange={() => {
                    void handleToggleGlobal();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.sectionTitle}>Reminders</Text>

              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Activity reminders"
                  onPress={handleToggleActivityReminders}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Activity reminders</Text>
                    {!activityRemindersEnabled ? <Text style={styles.rowSubtitle}>Off</Text> : null}
                  </VStack>
                </Pressable>
                <Switch
                  value={activityRemindersEnabled}
                  onValueChange={() => {
                    void handleToggleActivityReminders();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.rowPressable}>
                  <Pressable
                    style={({ pressed }) => [pressed && styles.rowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle daily show-up reminder"
                    onPress={handleToggleDailyShowUp}
                  >
                    <VStack>
                      <Text style={styles.rowTitle}>Daily show-up</Text>
                      {!dailyShowUpEnabled ? <Text style={styles.rowSubtitle}>Off</Text> : null}
                    </VStack>
                  </Pressable>
                  {dailyShowUpEnabled && (
                    <Pressable
                      onPress={() => {
                        openTimePicker('dailyShowUp');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Change daily reminder time"
                      hitSlop={8}
                    >
                      <Text style={styles.timeLabel}>Time · {dailyShowUpTimeLabel}</Text>
                    </Pressable>
                  )}
                </View>
                <Switch
                  value={dailyShowUpEnabled}
                  onValueChange={() => {
                    void handleToggleDailyShowUp();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.rowPressable}>
                  <Pressable
                    style={({ pressed }) => [pressed && styles.rowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle daily focus reminder"
                    onPress={handleToggleDailyFocus}
                  >
                    <VStack>
                      <Text style={styles.rowTitle}>Daily focus</Text>
                      {!dailyFocusEnabled ? <Text style={styles.rowSubtitle}>Off</Text> : null}
                    </VStack>
                  </Pressable>
                  {dailyFocusEnabled && (
                    <Pressable
                      onPress={() => {
                        openTimePicker('dailyFocus');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Change daily focus reminder time"
                      hitSlop={8}
                    >
                      <Text style={styles.timeLabel}>Time · {dailyFocusTimeLabel}</Text>
                    </Pressable>
                  )}
                </View>
                <Switch
                  value={dailyFocusEnabled}
                  onValueChange={() => {
                    void handleToggleDailyFocus();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.rowPressable}>
                  <Pressable
                    style={({ pressed }) => [pressed && styles.rowPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle goal nudges"
                    onPress={handleToggleGoalNudges}
                  >
                    <VStack>
                      <Text style={styles.rowTitle}>Goal nudges</Text>
                      {!goalNudgesEnabled ? <Text style={styles.rowSubtitle}>Off</Text> : null}
                    </VStack>
                  </Pressable>
                  {goalNudgesEnabled ? (
                    <Pressable
                      onPress={() => {
                        openTimePicker('goalNudge');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Change goal nudge time"
                      hitSlop={8}
                    >
                      <Text style={styles.timeLabel}>Time · {goalNudgeTimeLabel}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Switch
                  value={goalNudgesEnabled}
                  onValueChange={() => {
                    void handleToggleGoalNudges();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>

              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle streak and comeback reminders"
                  onPress={handleToggleStreakAndReactivation}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Streak & comeback</Text>
                    {!streakAndReactivationEnabled ? <Text style={styles.rowSubtitle}>Off</Text> : null}
                  </VStack>
                </Pressable>
                <Switch
                  value={streakAndReactivationEnabled}
                  onValueChange={() => {
                    void handleToggleStreakAndReactivation();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.sectionTitle}>Prompts</Text>

              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle plan your day prompts"
                  onPress={handleTogglePlanKickoff}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Plan your day prompts</Text>
                    <Text style={styles.rowSubtitle}>{planKickoffSummary}</Text>
                  </VStack>
                </Pressable>
                <Switch
                  value={planKickoffEnabled}
                  onValueChange={handleTogglePlanKickoff}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>

              {planKickoffEnabled ? (
                <VStack space="sm">
                  <View style={styles.optionWrap}>
                    {PLAN_KICKOFF_CADENCE_OPTIONS.map((option) => {
                      const selected = planKickoffCadence === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityLabel={`Set plan kickoff frequency to ${option.label}`}
                          onPress={() => handleSetPlanKickoffCadence(option.value)}
                          style={[styles.optionChip, selected && styles.optionChipSelected]}
                        >
                          <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {planKickoffCadence === 'weekly' ? (
                    <VStack space="xs">
                      <View style={styles.optionWrap}>
                        {WEEKDAY_OPTIONS.map((option) => {
                          const selected = planKickoffWeeklyDay === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              accessibilityRole="button"
                              accessibilityLabel={`Set weekly plan kickoff day to ${option.label}`}
                              onPress={() => handleSetPlanKickoffWeeklyDay(option.value)}
                              style={[styles.optionChip, selected && styles.optionChipSelected]}
                            >
                              <Text style={[styles.optionChipText, selected && styles.optionChipTextSelected]}>
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </VStack>
                  ) : null}
                </VStack>
              ) : null}

              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle location prompts"
                  onPress={handleToggleLocationOffers}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Location prompts</Text>
                    <Text style={styles.rowSubtitle}>
                      {locationPromptsEnabled ? locationOsStatusLabel : 'Off'}
                    </Text>
                  </VStack>
                </Pressable>
                <Switch
                  value={locationPromptsEnabled}
                  onValueChange={() => {
                    void handleToggleLocationOffers();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>
              <Text style={styles.helperText}>Plan your day prompts appear in app, not as push notifications.</Text>
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="sm">
              <Text style={styles.sectionTitle}>Email digest</Text>
              <Pressable
                style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel="Open Chapter Settings"
                onPress={() => {
                  // Jump over to the More tab's Chapters stack so the user lands
                  // in the same place whether they came from the Chapters screen
                  // or from Notifications settings.
                  (navigation as any).navigate('MoreTab', {
                    screen: 'MoreChapterDigestSettings',
                  });
                }}
              >
                <VStack>
                  <Text style={styles.rowTitle}>Chapter Settings</Text>
                  <Text style={styles.rowSubtitle}>Manage your weekly chapter email and schedule.</Text>
                </VStack>
              </Pressable>
            </VStack>
          </View>
        </ScrollView>

        <BottomDrawer
          visible={timePickerTarget !== null}
          onClose={closeTimePicker}
          snapPoints={Platform.OS === 'ios' ? ['48%'] : ['42%']}
          keyboardAvoidanceEnabled={false}
          dynamicSizing
        >
          <BottomDrawerHeader title={timePickerTitle} variant="withClose" onClose={closeTimePicker} />
          <VStack space="md" style={styles.timePickerSheetContent}>
            <Text style={styles.helperText}>Choose when this reminder should appear.</Text>
            <View style={styles.timePickerContainer}>
              <DateTimePicker
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                value={timePickerDraft}
                onChange={handleTimeChange}
              />
            </View>
            <HStack space="sm" style={styles.timePickerActions}>
              <Button variant="ghost" fullWidth onPress={closeTimePicker}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth onPress={() => void handleSaveTimePicker()}>
                Done
              </Button>
            </HStack>
          </VStack>
        </BottomDrawer>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: typography.bodySm.fontFamily,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.canvas,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowPressable: {
    flex: 1,
  },
  rowPressed: {
    backgroundColor: colors.shellAlt,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  rowSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  timeLabel: {
    ...typography.bodySm,
    color: colors.accent,
    marginTop: 4,
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
  timePickerActions: {
    justifyContent: 'space-between',
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  optionChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.shellAlt,
  },
  optionChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  optionChipTextSelected: {
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shellAlt,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.canvas,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.canvas,
  },
});


