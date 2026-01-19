import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import {
  getDefaultPlanAvailability,
  resolvePlanAvailability,
  type PlanAvailabilityByWeekday,
  type PlanDayAvailability,
} from '../../services/plan/planAvailability';
import { formatTimeLabel, setTimeOnDate } from '../../services/plan/planDates';
import { Button } from '../../ui/Button';
import { HStack, Text, VStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { Switch } from 'react-native';

type PickerState = {
  dayKey: keyof PlanAvailabilityByWeekday;
  mode: 'work' | 'personal';
  field: 'start' | 'end';
};

const DAY_LABELS: Array<{ key: keyof PlanAvailabilityByWeekday; label: string }> = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export function PlanAvailabilitySettingsScreen() {
  const navigation = useNavigation();
  const menuOpen = useDrawerStatus() === 'open';
  const userProfile = useAppStore((s) => s.userProfile);
  const updateUserProfile = useAppStore((s) => s.updateUserProfile);
  const initial = useMemo(() => resolvePlanAvailability(userProfile), [userProfile]);
  const [availability, setAvailability] = useState<PlanAvailabilityByWeekday>(initial);
  const [pickerState, setPickerState] = useState<PickerState | null>(null);

  const persist = (next: PlanAvailabilityByWeekday) => {
    setAvailability(next);
    updateUserProfile((current) => ({
      ...current,
      preferences: {
        ...(current.preferences ?? {}),
        plan: {
          ...(current.preferences?.plan ?? {}),
          availability: next,
        },
      },
    }));
  };

  const updateDay = (key: keyof PlanAvailabilityByWeekday, updates: Partial<PlanDayAvailability>) => {
    const next = { ...availability, [key]: { ...availability[key], ...updates } };
    persist(next);
  };

  const updateWindow = (
    key: keyof PlanAvailabilityByWeekday,
    mode: 'work' | 'personal',
    field: 'start' | 'end',
    value: string,
  ) => {
    const day = availability[key];
    const defaultWindow = mode === 'work' ? { start: '09:00', end: '17:00' } : { start: '17:00', end: '21:00' };
    const window = day.windows[mode][0] ?? defaultWindow;
    const updated = { ...window, [field]: value };
    const next = {
      ...availability,
      [key]: {
        ...day,
        windows: {
          ...day.windows,
          [mode]: [updated],
        },
      },
    };
    persist(next);
  };

  const handlePickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!pickerState) return;
    if (Platform.OS !== 'ios') {
      setPickerState(null);
    }
    if (!date) return;
    const minutes = date.getHours() * 60 + date.getMinutes();
    const hh = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const mm = (minutes % 60).toString().padStart(2, '0');
    updateWindow(pickerState.dayKey, pickerState.mode, pickerState.field, `${hh}:${mm}`);
  };

  const getWindowLabel = (day: PlanDayAvailability, mode: 'work' | 'personal') => {
    const window = day.windows[mode][0];
    if (!window) return 'Not set';
    const start = setTimeOnDate(new Date(), window.start);
    const end = setTimeOnDate(new Date(), window.end);
    if (!start || !end) return 'Not set';
    return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`;
  };

  const pickerValue = useMemo(() => {
    if (!pickerState) return new Date();
    const day = availability[pickerState.dayKey];
    const window = day.windows[pickerState.mode][0];
    const raw = window?.[pickerState.field];
    return raw ? setTimeOnDate(new Date(), raw) ?? new Date() : new Date();
  }, [availability, pickerState]);

  return (
    <AppShell>
      <View style={styles.screen}>
        <PageHeader
          title="Availability"
          menuOpen={menuOpen}
          onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <VStack space="sm">
            <Text style={styles.helperText}>
              Set when Plan can recommend commitments. Disabled days are treated as rest days.
            </Text>
            {DAY_LABELS.map(({ key, label }) => {
              const day = availability[key];
              return (
                <View key={key} style={styles.card}>
                  <HStack alignItems="center" justifyContent="space-between">
                    <VStack space="xs">
                      <Text style={styles.cardTitle}>{label}</Text>
                      <Text style={styles.cardSubtitle}>
                        {day.enabled ? 'Scheduling allowed' : 'Rest day'}
                      </Text>
                    </VStack>
                    <Switch
                      value={day.enabled}
                      onValueChange={(next) => updateDay(key, { enabled: next })}
                      trackColor={{ false: colors.shellAlt, true: colors.accent }}
                      thumbColor={colors.canvas}
                    />
                  </HStack>

                  <View style={styles.windowSection}>
                    {(['work', 'personal'] as const).map((mode) => (
                      <View key={mode} style={styles.windowRow}>
                        <HStack alignItems="center" justifyContent="space-between">
                          <HStack alignItems="center" space="xs">
                            <Icon name={mode === 'work' ? 'activity' : 'home'} size={16} color={colors.textSecondary} />
                            <Text style={styles.windowLabel}>
                              {mode === 'work' ? 'Work window' : 'Personal window'}
                            </Text>
                          </HStack>
                          <Text style={styles.windowValue}>{getWindowLabel(day, mode)}</Text>
                        </HStack>
                        <HStack alignItems="center" space="xs" style={styles.windowActions}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setPickerState({ dayKey: key, mode, field: 'start' })}
                            style={styles.timeChip}
                          >
                            <Text style={styles.timeChipText}>Start</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setPickerState({ dayKey: key, mode, field: 'end' })}
                            style={styles.timeChip}
                          >
                            <Text style={styles.timeChipText}>End</Text>
                          </Pressable>
                        </HStack>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            <Button variant="secondary" onPress={() => persist(getDefaultPlanAvailability())}>
              Reset defaults
            </Button>
          </VStack>
        </ScrollView>
        {pickerState ? (
          <DateTimePicker
            value={pickerValue}
            mode="time"
            onChange={handlePickerChange}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          />
        ) : null}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  windowSection: {
    gap: spacing.xs,
  },
  windowRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    backgroundColor: colors.canvas,
    gap: spacing.xs,
  },
  windowActions: {
    justifyContent: 'flex-end',
  },
  windowLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  windowValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  timeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  timeChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


