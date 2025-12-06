import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Platform } from 'react-native';
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

type NotificationsSettingsNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'SettingsNotifications'
>;

export function NotificationsSettingsScreen() {
  const navigation = useNavigation<NotificationsSettingsNavigationProp>();
  const preferences = useAppStore((state) => state.notificationPreferences);
  const setPreferences = useAppStore((state) => state.setNotificationPreferences);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

  const dailyShowUpTimeLabel = useMemo(() => {
    if (!preferences.dailyShowUpTime) {
      return '8:00 AM';
    }
    const [hourString, minuteString] = preferences.dailyShowUpTime.split(':');
    const hour = Number.parseInt(hourString ?? '8', 10);
    const minute = Number.parseInt(minuteString ?? '0', 10);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [preferences.dailyShowUpTime]);

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
    const nextTime = preferences.dailyShowUpTime ?? '8:00';
    const next = {
      ...preferences,
      notificationsEnabled: true,
      allowDailyShowUp: nextAllow,
      dailyShowUpTime: nextTime,
    };
    await NotificationService.applySettings(next);
  };

  const getInitialTimeForPicker = () => {
    if (preferences.dailyShowUpTime) {
      const [hourString, minuteString] = preferences.dailyShowUpTime.split(':');
      const hour = Number.parseInt(hourString ?? '8', 10);
      const minute = Number.parseInt(minuteString ?? '0', 10);
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      return date;
    }
    const date = new Date();
    date.setHours(8, 0, 0, 0);
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
    const next = {
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
              kwilt can send gentle, identity-aware reminders so tiny steps on your Activities don&apos;t
              slip through the cracks.
            </Text>
          </View>

          <View style={styles.card}>
            <VStack space="md">
              <VStack space="xs">
                <Text style={styles.sectionTitle}>System notifications</Text>
                <Text style={styles.helperText}>{osStatusLabel}</Text>
              </VStack>
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Toggle notifications from kwilt"
                onPress={handleToggleGlobal}
              >
                <VStack flex={1}>
                  <Text style={styles.rowTitle}>Allow notifications from kwilt</Text>
                  <Text style={styles.rowSubtitle}>
                    Control whether kwilt can schedule any reminders on this device.
                  </Text>
                </VStack>
                <HStack alignItems="center">
                  <View
                    style={[
                      styles.toggle,
                      preferences.notificationsEnabled && styles.toggleOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        preferences.notificationsEnabled && styles.toggleThumbOn,
                      ]}
                    />
                  </View>
                </HStack>
              </Pressable>
            </VStack>
          </View>

          <View style={styles.card}>
            <VStack space="md">
              <Text style={styles.sectionTitle}>Reminder types</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Toggle Activity reminders"
                onPress={handleToggleActivityReminders}
              >
                <VStack flex={1}>
                  <Text style={styles.rowTitle}>Activity reminders</Text>
                  <Text style={styles.rowSubtitle}>
                    Use reminders you set on Activities to schedule local notifications.
                  </Text>
                </VStack>
                <HStack alignItems="center">
                  <View
                    style={[
                      styles.toggle,
                      preferences.notificationsEnabled &&
                        preferences.allowActivityReminders &&
                        styles.toggleOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        preferences.notificationsEnabled &&
                          preferences.allowActivityReminders &&
                          styles.toggleThumbOn,
                      ]}
                    />
                  </View>
                </HStack>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Toggle daily show-up reminder"
                onPress={handleToggleDailyShowUp}
              >
                <VStack flex={1}>
                  <Text style={styles.rowTitle}>Daily show-up reminder</Text>
                  <Text style={styles.rowSubtitle}>
                    Get a gentle nudge once a day to review Today and choose one tiny step.
                  </Text>
                  {preferences.allowDailyShowUp && (
                    <Pressable
                      onPress={() => setIsTimePickerVisible(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Change daily reminder time"
                    >
                      <Text style={styles.timeLabel}>Time · {dailyShowUpTimeLabel}</Text>
                    </Pressable>
                  )}
                </VStack>
                <HStack alignItems="center">
                  <View
                    style={[
                      styles.toggle,
                      preferences.notificationsEnabled &&
                        preferences.allowDailyShowUp &&
                        styles.toggleOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        preferences.notificationsEnabled &&
                          preferences.allowDailyShowUp &&
                          styles.toggleThumbOn,
                      ]}
                    />
                  </View>
                </HStack>
              </Pressable>

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


