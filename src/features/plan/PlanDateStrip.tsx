import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { HStack, Text, VStack } from '../../ui/primitives';

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function startOfWeek(date: Date) {
  // Sunday-start week (matches common calendar mental model; can be localized later).
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDow(d: Date) {
  return d.toLocaleDateString([], { weekday: 'short' });
}

type PlanDateStripProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
};

export function PlanDateStrip({ selectedDate, onSelectDate }: PlanDateStripProps) {
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <HStack alignItems="center" justifyContent="space-between" style={styles.row}>
        {days.map((d) => {
          const selected = isSameDay(d, selectedDate);
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => onSelectDate(d)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${d.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}`}
              style={styles.dayPressable}
            >
              <VStack space={2} style={styles.dayCell}>
                <Text style={styles.dow}>{formatDow(d)}</Text>
                <View style={[styles.dayNumberCircle, selected ? styles.dayNumberCircleSelected : null]}>
                  <Text style={[styles.dayNumber, selected ? styles.dayNumberSelected : null]}>{d.getDate()}</Text>
                </View>
              </VStack>
            </Pressable>
          );
        })}
      </HStack>
    </ScrollView>
  );
}

const CIRCLE = 32;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  row: {
    flex: 1,
    width: '100%',
  },
  dayPressable: {
    borderRadius: 10,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  dow: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dayNumberCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayNumberCircleSelected: {
    backgroundColor: colors.textPrimary,
  },
  dayNumber: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: colors.canvas,
  },
});


