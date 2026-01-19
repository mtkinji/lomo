import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { PlanPager } from './PlanPager';
import { HStack, Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { formatDayLabel } from '../../services/plan/planDates';
export function PlanScreen() {
  const navigation = useNavigation();
  const menuOpen = useDrawerStatus() === 'open';
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'today' | 'tomorrow' | 'custom'>('today');

  const handleSelectToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setSelectionMode('today');
  };

  const handleSelectTomorrow = () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
    setSelectionMode('tomorrow');
  };

  const handleSelectCustom = () => {
    setSelectionMode('custom');
    setPickerVisible(true);
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setPickerVisible(false);
    }
    if (date) {
      setSelectedDate(date);
      setSelectionMode('custom');
    }
  };

  const selectedLabel = useMemo(() => {
    if (selectionMode === 'today') return 'Today';
    if (selectionMode === 'tomorrow') return 'Tomorrow';
    return formatDayLabel(selectedDate);
  }, [selectedDate, selectionMode]);

  return (
    <AppShell>
      <View style={styles.container}>
        <PageHeader
          title="Plan"
          menuOpen={menuOpen}
          onPressMenu={() => {
            navigation.dispatch(DrawerActions.openDrawer());
          }}
        />
        <View style={styles.selectorCard}>
          <HStack gap={spacing.sm} alignItems="center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Plan for today"
              onPress={handleSelectToday}
              style={[styles.selectorPill, selectionMode === 'today' ? styles.selectorPillActive : null]}
            >
              <Text style={[styles.selectorText, selectionMode === 'today' ? styles.selectorTextActive : null]}>
                Today
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Plan for tomorrow"
              onPress={handleSelectTomorrow}
              style={[styles.selectorPill, selectionMode === 'tomorrow' ? styles.selectorPillActive : null]}
            >
              <Text style={[styles.selectorText, selectionMode === 'tomorrow' ? styles.selectorTextActive : null]}>
                Tomorrow
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pick a date"
              onPress={handleSelectCustom}
              style={[styles.selectorPill, selectionMode === 'custom' ? styles.selectorPillActive : null]}
            >
              <Text style={[styles.selectorText, selectionMode === 'custom' ? styles.selectorTextActive : null]}>
                Pick date
              </Text>
            </Pressable>
          </HStack>
          <Text style={styles.selectorSubtitle}>{selectedLabel}</Text>
          {pickerVisible ? (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              onChange={handleDateChange}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
            />
          ) : null}
        </View>
        <PlanPager insetMode="screen" targetDate={selectedDate} entryPoint="manual" />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectorCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  selectorPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectorText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  selectorTextActive: {
    color: colors.primaryForeground,
  },
  selectorSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

