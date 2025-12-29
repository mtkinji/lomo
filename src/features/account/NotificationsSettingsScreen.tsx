import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Platform, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import type { SettingsStackParamList } from '../../navigation/RootNavigator';
import { HStack, Text, VStack } from '../../ui/primitives';
import { NotificationService } from '../../services/NotificationService';
import {
  DEFAULT_DAILY_FOCUS_TIME,
  DEFAULT_DAILY_SHOW_UP_TIME,
  DEFAULT_GOAL_NUDGE_TIME,
} from '../../services/notifications/defaultTimes';

type NotificationsSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsNotifications'
>;

export function NotificationsSettingsScreen() {
  const navigation = useNavigation<NotificationsSettingsNavigationProp>();
  const preferences = useAppStore((state) => state.notificationPreferences);
  const setPreferences = useAppStore((state) => state.setNotificationPreferences);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'dailyShowUp' | 'dailyFocus' | 'goalNudge'>(
    'dailyShowUp',
  );

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

  const getInitialTimeForPicker = () => {
    const raw =
      timePickerTarget === 'dailyFocus'
        ? preferences.dailyFocusTime
        : timePickerTarget === 'goalNudge'
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
      timePickerTarget === 'dailyFocus'
        ? DEFAULT_DAILY_FOCUS_TIME
        : timePickerTarget === 'goalNudge'
          ? DEFAULT_GOAL_NUDGE_TIME
          : DEFAULT_DAILY_SHOW_UP_TIME;
    const date = new Date();
    const [h, m] = fallback.split(':');
    date.setHours(Number.parseInt(h ?? '8', 10), Number.parseInt(m ?? '0', 10), 0, 0);
    return date;
  };

  const handleTimeChange = async (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setIsTimePickerVisible(false);
    }
    if (!date || event.type === 'dismissed') {
      return;
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
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
          <View style={styles.section}>
            <Text style={styles.sectionBody}>
              Kwilt can send gentle, identity-aware reminders so tiny steps on your Activities don&apos;t
              slip through the cracks.
            </Text>
          </View>

          <View style={styles.card}>
            <VStack space="md">
              <VStack space="xs">
                <Text style={styles.sectionTitle}>System notifications</Text>
                <Text style={styles.helperText}>{osStatusLabel}</Text>
              </VStack>
              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle notifications from Kwilt"
                  onPress={handleToggleGlobal}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Allow notifications from Kwilt</Text>
                    <Text style={styles.rowSubtitle}>
                      Control whether Kwilt can schedule any reminders on this device.
                    </Text>
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
            <VStack space="md">
              <Text style={styles.sectionTitle}>Reminder types</Text>

              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Activity reminders"
                  onPress={handleToggleActivityReminders}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Activity reminders</Text>
                    <Text style={styles.rowSubtitle}>
                      Use reminders you set on Activities to schedule local notifications.
                    </Text>
                  </VStack>
                </Pressable>
                <Switch
                  value={preferences.notificationsEnabled && preferences.allowActivityReminders}
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
                      <Text style={styles.rowTitle}>Daily show-up reminder</Text>
                      <Text style={styles.rowSubtitle}>
                        Get a gentle nudge once a day to review Today and choose one tiny step.
                      </Text>
                    </VStack>
                  </Pressable>
                  {preferences.notificationsEnabled && preferences.allowDailyShowUp && (
                    <Pressable
                      onPress={() => {
                        setTimePickerTarget('dailyShowUp');
                        setIsTimePickerVisible(true);
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
                  value={preferences.notificationsEnabled && preferences.allowDailyShowUp}
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
                      <Text style={styles.rowTitle}>Daily focus session</Text>
                      <Text style={styles.rowSubtitle}>
                        A once-a-day nudge to finish one full Focus timer (clarity + momentum).
                      </Text>
                    </VStack>
                  </Pressable>
                  {preferences.notificationsEnabled && preferences.allowDailyFocus && (
                    <Pressable
                      onPress={() => {
                        setTimePickerTarget('dailyFocus');
                        setIsTimePickerVisible(true);
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
                  value={preferences.notificationsEnabled && preferences.allowDailyFocus}
                  onValueChange={() => {
                    void handleToggleDailyFocus();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>

              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle goal nudges"
                  onPress={handleToggleGoalNudges}
                >
                  <VStack>
                    <Text style={styles.rowTitle}>Goal nudges</Text>
                    <Text style={styles.rowSubtitle}>
                      A gentle daily nudge to take one tiny step when you have Goals with incomplete Activities.
                    </Text>
                  </VStack>
                </Pressable>
                <Switch
                  value={preferences.notificationsEnabled && preferences.allowGoalNudges}
                  onValueChange={() => {
                    void handleToggleGoalNudges();
                  }}
                  trackColor={{ false: colors.shellAlt, true: colors.accent }}
                  thumbColor={colors.canvas}
                />
              </View>
              {preferences.notificationsEnabled && preferences.allowGoalNudges && (
                <Pressable
                  onPress={() => {
                    setTimePickerTarget('goalNudge');
                    setIsTimePickerVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Change goal nudge time"
                  hitSlop={8}
                >
                  <Text style={styles.timeLabel}>Time · {goalNudgeTimeLabel}</Text>
                </Pressable>
              )}

              <Text style={styles.helperText}>
                Streak nudges and reactivation flows will be added here as they roll out.
              </Text>
            </VStack>
          </View>

          {isTimePickerVisible && (
            <View style={styles.timePickerContainer}>
              <DateTimePicker
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                value={getInitialTimeForPicker()}
                onChange={handleTimeChange}
              />
            </View>
          )}
        </ScrollView>
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
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: typography.titleSm.fontFamily,
  },
  sectionBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.canvas,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
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
    marginTop: spacing.xs,
  },
  timePickerContainer: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
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


