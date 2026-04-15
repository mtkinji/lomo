import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, Heading, VStack, HStack } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography, fonts } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { localDateKey } from '../../store/streakProtection';

function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function StreakWeeklyRecapCard(props: { onDismiss: () => void }) {
  const currentShowUpStreak = useAppStore((s) => s.currentShowUpStreak) ?? 0;
  const lastShowUpDate = useAppStore((s) => s.lastShowUpDate);
  const activityCompletionHours = useAppStore((s) => s.activityCompletionHours) ?? [];

  const now = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => getWeekDays(now), [now]);

  const showUpDays = useMemo(() => {
    const days = new Set<string>();
    if (lastShowUpDate) days.add(lastShowUpDate);
    const hours = activityCompletionHours;
    if (hours.length > 0 && lastShowUpDate) {
      days.add(lastShowUpDate);
    }
    return days;
  }, [lastShowUpDate, activityCompletionHours]);

  const filledCount = useMemo(() => {
    let count = 0;
    for (const day of weekDays) {
      const key = localDateKey(day);
      if (showUpDays.has(key) || (day <= now && currentShowUpStreak > 0 && isWithinStreakWindow(day, lastShowUpDate, currentShowUpStreak))) {
        count++;
      }
    }
    return count;
  }, [weekDays, showUpDays, currentShowUpStreak, lastShowUpDate, now]);

  const isCelebratory = filledCount >= 7;
  const isCompassionate = filledCount < 3;

  const headline = isCelebratory
    ? 'Perfect week!'
    : isCompassionate
      ? 'Every day is a fresh start'
      : `${filledCount} days this week`;

  const subheadline = isCelebratory
    ? `You showed up every day. ${currentShowUpStreak}-day streak and counting.`
    : isCompassionate
      ? `You showed up ${filledCount} day${filledCount === 1 ? '' : 's'}. That still counts.`
      : `${currentShowUpStreak}-day streak · ${filledCount}/7 days showed up`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <VStack space="xs" style={styles.headerLeft}>
          <Heading style={styles.headline}>{headline}</Heading>
          <Text style={styles.subheadline}>{subheadline}</Text>
        </VStack>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss weekly recap"
          onPress={props.onDismiss}
          hitSlop={12}
        >
          <Icon name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <HStack space="sm" style={styles.dotsRow}>
        {weekDays.map((day, i) => {
          const key = localDateKey(day);
          const filled = showUpDays.has(key) || (day <= now && currentShowUpStreak > 0 && isWithinStreakWindow(day, lastShowUpDate, currentShowUpStreak));
          const isToday = key === localDateKey(now);
          return (
            <View key={key} style={styles.dayColumn}>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{DAY_LABELS[i]}</Text>
              <View
                style={[
                  styles.dot,
                  filled ? styles.dotFilled : styles.dotEmpty,
                  isToday && !filled && styles.dotToday,
                ]}
              />
            </View>
          );
        })}
      </HStack>
    </View>
  );
}

function isWithinStreakWindow(
  day: Date,
  lastShowUpDate: string | null,
  streakLength: number,
): boolean {
  if (!lastShowUpDate || streakLength <= 0) return false;
  const lastDate = new Date(lastShowUpDate + 'T00:00:00');
  const dayTime = day.getTime();
  const lastTime = lastDate.getTime();
  if (dayTime > lastTime) return false;
  const diffDays = Math.floor((lastTime - dayTime) / (24 * 60 * 60 * 1000));
  return diffDays < streakLength;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headline: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  subheadline: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  dotsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  dayLabelToday: {
    color: colors.accent,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: {
    backgroundColor: colors.accent,
  },
  dotEmpty: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dotToday: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
});
