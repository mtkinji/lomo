import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { Activity } from '../../domain/types';
import { formatTimeRange } from '../../services/plan/planDates';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { EmptyState, HStack, Text, VStack } from '../../ui/primitives';
import type { CalendarEvent } from '../../services/plan/calendarApi';

type KwiltBlock = {
  activity: Activity;
  start: Date;
  end: Date;
};

type PlanCalendarLensPageProps = {
  targetDayLabel: string;
  targetDate: Date;
  externalEvents: CalendarEvent[];
  calendarColorByRefKey: Record<string, string>;
  proposedBlocks: Array<{ title: string; start: Date; end: Date }>;
  kwiltBlocks: KwiltBlock[];
  conflictActivityIds: string[];
  calendarStatus: 'unknown' | 'connected' | 'missing';
  /** When true, show a lightweight skeleton while external calendar data is still loading. */
  isLoadingExternal?: boolean;
  onOpenCalendarSettings: () => void;
  onMoveCommitment: (activityId: string, newStart: Date) => void;
  onPressKwiltBlock?: (activityId: string) => void;
  onPressExternalEvent?: (event: {
    title: string;
    start: Date;
    end: Date;
    calendarLabel?: string | null;
    color?: string | null;
  }) => void;
  /**
   * Optional: called when the user taps empty space on the timeline (not an event block).
   * This enables "tap-to-place" scheduling flows.
   */
  onPressEmptyTime?: (params: { date: Date }) => void;
  /**
   * Extra padding applied by the page itself. When hosted inside `BottomDrawer`,
   * the drawer already supplies a horizontal gutter, so this should be 0.
   */
  contentPadding?: number;
};

export function PlanCalendarLensPage({
  targetDayLabel,
  targetDate,
  externalEvents,
  calendarColorByRefKey,
  proposedBlocks,
  kwiltBlocks,
  conflictActivityIds,
  calendarStatus,
  isLoadingExternal = false,
  onOpenCalendarSettings,
  onMoveCommitment,
  onPressKwiltBlock,
  onPressExternalEvent,
  onPressEmptyTime,
  contentPadding = spacing.xl,
}: PlanCalendarLensPageProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const [pendingMoveDate, setPendingMoveDate] = useState<Date | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [eventsColumnWidth, setEventsColumnWidth] = useState(0);

  const dayStart = useMemo(() => {
    const d = new Date(targetDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [targetDate]);

  const dayEnd = useMemo(() => {
    const d = new Date(dayStart);
    d.setDate(d.getDate() + 1);
    return d;
  }, [dayStart]);

  const sortedKwilt = useMemo(
    () => [...kwiltBlocks].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [kwiltBlocks],
  );

  const sortedProposals = useMemo(
    () => [...proposedBlocks].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [proposedBlocks],
  );

  const externalEventsForDay = useMemo(() => {
    const items = Array.isArray(externalEvents) ? externalEvents : [];
    const filtered = items
      .map((e) => {
        const start = new Date(e.start);
        const end = new Date(e.end);
        return {
          ...e,
          title: e.title ?? null,
          _start: start,
          _end: end,
          _isAllDay: Boolean(e.isAllDay),
        };
      })
      .filter((e) => {
        // IMPORTANT: externalEvents may be prefetched for a multi-day window.
        // Always filter to the current day window for both timed and all-day events.
        if (Number.isNaN(e._start.getTime()) || Number.isNaN(e._end.getTime())) return false;
        return e._end > dayStart && e._start < dayEnd;
      });

    // Providers can sometimes return duplicate event rows for the same event instance.
    // De-dupe aggressively to avoid React key collisions and double-rendering.
    const unique = new Map<string, (typeof filtered)[number]>();
    for (const e of filtered) {
      const k = `${e.provider}:${e.accountId}:${e.calendarId}:${e.eventId}:${e._start.toISOString()}:${e._end.toISOString()}:${
        e._isAllDay ? '1' : '0'
      }`;
      if (!unique.has(k)) unique.set(k, e);
    }

    return Array.from(unique.values()).sort((a, b) => a._start.getTime() - b._start.getTime());
  }, [externalEvents, dayStart, dayEnd]);

  const allDayEvents = useMemo(() => externalEventsForDay.filter((e) => e._isAllDay), [externalEventsForDay]);
  const timedExternalEvents = useMemo(() => externalEventsForDay.filter((e) => !e._isAllDay), [externalEventsForDay]);

  const handleMovePress = (activityId: string, start: Date) => {
    setPendingMoveId(activityId);
    setPendingMoveDate(start);
    setPickerVisible(true);
  };

  const handleMoveChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    if (!pendingMoveDate) return;
    const next = new Date(pendingMoveDate);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setPendingMoveDate(next);

    // Android picker is a modal; apply immediately and close.
    if (Platform.OS !== 'ios') {
      setPickerVisible(false);
      if (pendingMoveId) onMoveCommitment(pendingMoveId, next);
    }
  };

  const handleMoveCancel = () => {
    setPickerVisible(false);
    setPendingMoveId(null);
    setPendingMoveDate(null);
  };

  const handleMoveDone = () => {
    if (pendingMoveId && pendingMoveDate) {
      onMoveCommitment(pendingMoveId, pendingMoveDate);
    }
    setPickerVisible(false);
  };

  const isToday = useMemo(() => new Date().toDateString() === new Date(targetDate).toDateString(), [targetDate]);

  useEffect(() => {
    // Keep the "now" indicator fresh without re-rendering constantly.
    if (!isToday) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  useEffect(() => {
    // Scroll to a sensible default: "now" if today, otherwise 8am.
    const hour = isToday ? new Date().getHours() : 8;
    const y = Math.max(0, hour * HOUR_HEIGHT - HOUR_HEIGHT);
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [targetDate, isToday]);

  const hasTopChromeContent = isLoadingExternal || allDayEvents.length > 0;

  type TimelineItem = {
    kind: 'external' | 'proposal' | 'kwilt';
    id: string;
    title: string;
    start: Date;
    end: Date;
    color: string;
    borderColor?: string;
    conflict?: boolean;
    onLongPress?: () => void;
    onPress?: () => void;
  };

  function clampToDay(start: Date, end: Date): { start: Date; end: Date } {
    const s = start < dayStart ? dayStart : start;
    const e = end > dayEnd ? dayEnd : end;
    return { start: s, end: e };
  }

  function minutesFromDayStart(d: Date): number {
    return (d.getTime() - dayStart.getTime()) / 60000;
  }

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    for (const e of timedExternalEvents) {
      const key = `${e.provider}:${e.accountId}:${e.calendarId}`;
      const color = calendarColorByRefKey?.[key] ?? colors.gray400;
      items.push({
        kind: 'external',
        // NOTE: Some providers can yield duplicate items with the same eventId in a single fetch.
        // Include start time in the ID to keep React keys unique per rendered instance.
        id: `${key}:${e.eventId}:${e._start.toISOString()}`,
        title: (e.title ?? 'Busy').trim() || 'Busy',
        start: e._start,
        end: e._end,
        color,
        onPress: onPressExternalEvent
          ? () =>
              onPressExternalEvent({
                title: (e.title ?? 'Busy').trim() || 'Busy',
                start: e._start,
                end: e._end,
                calendarLabel: (e.provider ?? '').trim() ? String(e.provider) : 'External calendar',
                color,
              })
          : undefined,
      });
    }
    for (const p of sortedProposals) {
      items.push({
        kind: 'proposal',
        id: `proposal:${p.title}:${p.start.toISOString()}`,
        title: p.title,
        start: p.start,
        end: p.end,
        // Recommendations are *not* committed calendar events yet. Keep them visually distinct.
        color: colors.shellAlt,
        borderColor: colors.gray400,
      });
    }
    for (const b of sortedKwilt) {
      const conflict = conflictActivityIds.includes(b.activity.id);
      items.push({
        kind: 'kwilt',
        id: `kwilt:${b.activity.id}`,
        title: b.activity.title,
        start: b.start,
        end: b.end,
        color: colors.pine200,
        borderColor: conflict ? colors.accentRoseStrong : colors.pine500,
        conflict,
        onLongPress: () => handleMovePress(b.activity.id, b.start),
        onPress: onPressKwiltBlock ? () => onPressKwiltBlock(b.activity.id) : undefined,
      });
    }
    return items
      .filter((it) => {
        if (Number.isNaN(it.start.getTime()) || Number.isNaN(it.end.getTime())) return false;
        return it.end > dayStart && it.start < dayEnd;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [
    timedExternalEvents,
    sortedProposals,
    sortedKwilt,
    calendarColorByRefKey,
    conflictActivityIds,
    onPressExternalEvent,
    onPressKwiltBlock,
    dayStart,
    dayEnd,
  ]);

  type PositionedItem = TimelineItem & { top: number; height: number; col: number; colCount: number };

  const positionedItems = useMemo<PositionedItem[]>(() => {
    const minPerDay = 24 * 60;
    const toMin = (d: Date) => Math.max(0, Math.min(minPerDay, minutesFromDayStart(d)));

    const normalized = timelineItems.map((it) => {
      const clamped = clampToDay(it.start, it.end);
      const startMin = toMin(clamped.start);
      const endMin = Math.max(startMin + 10, toMin(clamped.end)); // ensure min height
      return {
        it,
        startMs: clamped.start.getTime(),
        endMs: clamped.end.getTime(),
        startMin,
        endMin,
      };
    });

    // Build overlap clusters (connected components by time overlap).
    const clusters: typeof normalized[] = [];
    let current: typeof normalized = [];
    let currentEndMs = -Infinity;
    for (const n of normalized) {
      if (current.length === 0) {
        current = [n];
        currentEndMs = n.endMs;
        continue;
      }
      if (n.startMs < currentEndMs) {
        current.push(n);
        currentEndMs = Math.max(currentEndMs, n.endMs);
      } else {
        clusters.push(current);
        current = [n];
        currentEndMs = n.endMs;
      }
    }
    if (current.length) clusters.push(current);

    const result: PositionedItem[] = [];
    for (const cluster of clusters) {
      // Greedy column assignment.
      const colEnds: number[] = []; // endMs per column
      const assigned: Array<{ n: (typeof normalized)[number]; col: number }> = [];
      for (const n of cluster) {
        let col = 0;
        while (col < colEnds.length && n.startMs < colEnds[col]) col += 1;
        if (col === colEnds.length) colEnds.push(n.endMs);
        colEnds[col] = n.endMs;
        assigned.push({ n, col });
      }
      const colCount = Math.max(1, colEnds.length);
      for (const a of assigned) {
        const top = (a.n.startMin / 60) * HOUR_HEIGHT;
        const height = Math.max(MIN_EVENT_HEIGHT, ((a.n.endMin - a.n.startMin) / 60) * HOUR_HEIGHT);
        result.push({
          ...a.n.it,
          top,
          height,
          col: a.col,
          colCount,
        });
      }
    }

    return result;
  }, [timelineItems, dayStart]);

  const nowTop = useMemo(() => {
    const minutes = minutesFromDayStart(now);
    const clampedMinutes = Math.max(0, Math.min(24 * 60, minutes));
    return (clampedMinutes / 60) * HOUR_HEIGHT;
  }, [now, dayStart]);

  const showNowIndicator = isToday && now >= dayStart && now < dayEnd;

  if (calendarStatus === 'missing') {
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState
            title="Connect calendars"
            instructions="Connect calendars to show your day and move commitments."
          />
          <Button variant="primary" fullWidth onPress={onOpenCalendarSettings} style={styles.cta}>
            Open Calendar Settings
          </Button>
        </View>
      </View>
    );
  }

  const handlePressEmptyTime = (e: GestureResponderEvent) => {
    if (!onPressEmptyTime) return;
    const rawY = typeof e?.nativeEvent?.locationY === 'number' ? e.nativeEvent.locationY : 0;
    const clampedY = Math.max(0, rawY);
    const minutesRaw = (clampedY / HOUR_HEIGHT) * 60;
    const minutesClamped = Math.max(0, Math.min(24 * 60, minutesRaw));
    const snappedMinutes = Math.max(0, Math.min(24 * 60, Math.round(minutesClamped / 15) * 15));
    const date = new Date(dayStart.getTime() + snappedMinutes * 60_000);
    onPressEmptyTime({ date });
  };

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.topChrome,
          { paddingHorizontal: contentPadding },
          !hasTopChromeContent ? styles.topChromeCompact : null,
        ]}
      >
        <VStack space={spacing.sm}>
          {isLoadingExternal ? (
            <Text style={styles.loadingLabel} accessibilityLabel="Loading calendar events">
              Loading calendar…
            </Text>
          ) : null}
          {allDayEvents.length > 0 ? (
            <View style={styles.allDayRow}>
              <Text style={styles.allDayLabel}>All day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.allDayChips}>
                {allDayEvents.slice(0, 8).map((e) => (
                  <View
                    // Include start time to avoid duplicate keys if provider returns duplicates.
                    key={`${e.provider}:${e.accountId}:${e.calendarId}:${e.eventId}:${e._start.toISOString()}`}
                    style={[
                      styles.allDayChip,
                      (() => {
                        const key = `${e.provider}:${e.accountId}:${e.calendarId}`;
                        const c = calendarColorByRefKey?.[key];
                        return typeof c === 'string' && c.trim().length > 0
                          ? { borderLeftWidth: 4, borderLeftColor: c.trim() }
                          : null;
                      })(),
                    ]}
                  >
                    <Text style={styles.allDayChipText}>{(e.title ?? 'All-day').trim() || 'All-day'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </VStack>
      </View>

      <ScrollView
        ref={(n) => {
          scrollRef.current = n;
        }}
        contentContainerStyle={[styles.timelineScrollContent, { paddingHorizontal: contentPadding, paddingBottom: spacing.xl * 4 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineContainer}>
          {/* Hour grid */}
          <View style={styles.hourColumn}>
            {HOURS.map((h) => (
              <View key={h} style={styles.hourRow}>
                <Text style={styles.hourLabel}>{formatHourLabel(h)}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.eventsColumn} onPress={handlePressEmptyTime}>
            <View
              style={styles.eventsColumnMeasure}
              onLayout={(e) => {
                const w = e?.nativeEvent?.layout?.width;
                if (typeof w === 'number' && !Number.isNaN(w) && w > 0) setEventsColumnWidth(w);
              }}
              pointerEvents="none"
            />
            {HOURS.map((h) => (
              <View key={h} style={styles.gridRow} />
            ))}

            {showNowIndicator ? (
              <View pointerEvents="none" style={[styles.nowIndicator, { top: nowTop }]}>
                <View style={styles.nowDot} />
                <View style={styles.nowLine} />
              </View>
            ) : null}

            {positionedItems.map((it) => {
              const colCount = Math.max(1, it.colCount);
              const widthPct = 100 / colCount;
              const leftPct = it.col * widthPct;
              const timeText = formatTimeRange(it.start, it.end);
              const isProposal = it.kind === 'proposal';
              const isExternal = it.kind === 'external';
              const backgroundColor = isExternal ? colors.card : it.color;
              const borderColor = it.borderColor ?? colors.border;
              const available = Math.max(0, eventsColumnWidth - EVENTS_INSET * 2);
              const colWidthPx =
                colCount > 0 ? Math.max(0, (available - COLUMN_GUTTER * Math.max(0, colCount - 1)) / colCount) : 0;
              const leftPx = EVENTS_INSET + it.col * (colWidthPx + COLUMN_GUTTER);
              const usePxLayout = eventsColumnWidth > 0 && colWidthPx > 0;
              return (
                <Pressable
                  key={it.id}
                  onPress={it.onPress}
                  onLongPress={it.onLongPress}
                  accessibilityRole={it.onPress || it.onLongPress ? 'button' : undefined}
                  accessibilityLabel={
                    it.kind === 'kwilt'
                      ? it.onPress
                        ? `Open ${it.title}`
                        : `Move ${it.title}`
                      : it.kind === 'external'
                        ? `Open ${it.title}`
                        : undefined
                  }
                  style={[
                    styles.eventBlock,
                    {
                      top: it.top,
                      height: it.height,
                      left: usePxLayout ? leftPx : (`${leftPct}%` as any),
                      width: usePxLayout ? colWidthPx : (`${widthPct}%` as any),
                      backgroundColor,
                      borderColor,
                      borderStyle: isProposal ? 'dashed' : 'solid',
                      opacity: isProposal ? 0.78 : 1,
                    },
                    isExternal
                      ? {
                          // Preserve the originating calendar’s color while keeping the card surface readable.
                          borderLeftWidth: 4,
                          borderLeftColor: it.color,
                        }
                      : null,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.eventBlockTitle}>
                    {it.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.eventBlockMeta}>
                    {timeText}
                    {it.kind === 'kwilt' ? ' • Hold to move' : isProposal ? ' • Suggested' : ''}
                  </Text>
                  {it.conflict ? <Text style={styles.conflictBadge}>Conflict</Text> : null}
                </Pressable>
              );
            })}

            {isLoadingExternal && timedExternalEvents.length === 0 ? (
              <>
                {/* Lightweight skeleton overlay: gives immediate feedback without blocking layout. */}
                <View
                  style={[
                    styles.skeletonBlock,
                    {
                      top: 1.2 * HOUR_HEIGHT,
                      height: 0.9 * HOUR_HEIGHT,
                      left: EVENTS_INSET + 10,
                      right: EVENTS_INSET + 40,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonBlock,
                    {
                      top: 3.6 * HOUR_HEIGHT,
                      height: 1.1 * HOUR_HEIGHT,
                      left: EVENTS_INSET + 16,
                      right: EVENTS_INSET + 48,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonBlock,
                    {
                      top: 5.2 * HOUR_HEIGHT,
                      height: 0.8 * HOUR_HEIGHT,
                      left: EVENTS_INSET + 22,
                      right: EVENTS_INSET + 56,
                    },
                  ]}
                />
              </>
            ) : null}
          </Pressable>
        </View>

        {pickerVisible && pendingMoveDate ? (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={pendingMoveDate}
              mode="time"
              onChange={handleMoveChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
            {Platform.OS === 'ios' ? (
              <HStack space={spacing.sm} style={styles.pickerActions}>
                <Button variant="ghost" size="sm" onPress={handleMoveCancel}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onPress={handleMoveDone}>
                  Done
                </Button>
              </HStack>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const HOUR_HEIGHT = 64;
const MIN_EVENT_HEIGHT = 28;
const HOURS = Array.from({ length: 24 }).map((_, i) => i);
const EVENTS_INSET = spacing.xs;
const COLUMN_GUTTER = 6;

function formatHourLabel(h: number): string {
  const hour = ((h + 11) % 12) + 1;
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${hour} ${suffix}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  emptyContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  topChrome: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.canvas,
  },
  topChromeCompact: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  loadingLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  cta: {
    marginTop: spacing.md,
    width: '100%',
    maxWidth: 420,
  },
  allDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  allDayLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    width: 56,
  },
  allDayChips: {
    flexGrow: 1,
    gap: spacing.xs,
    paddingVertical: 2,
  },
  allDayChip: {
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allDayChipText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timelineScrollContent: {
    paddingTop: spacing.sm,
  },
  timelineContainer: {
    flexDirection: 'row',
    minHeight: HOUR_HEIGHT * 24,
  },
  hourColumn: {
    width: 56,
  },
  hourRow: {
    height: HOUR_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  hourLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  eventsColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  eventsColumnMeasure: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  skeletonBlock: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.65,
  },
  gridRow: {
    height: HOUR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    opacity: 0.6,
  },
  nowIndicator: {
    position: 'absolute',
    left: EVENTS_INSET,
    right: EVENTS_INSET,
    zIndex: 20,
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.sumi900,
    opacity: 1,
  },
  nowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: -4,
    top: -3.5,
    backgroundColor: colors.sumi900,
    opacity: 1,
    borderWidth: 1,
    borderColor: colors.canvas,
  },
  eventBlock: {
    position: 'absolute',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  eventBlockTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  eventBlockMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  conflictBadge: {
    ...typography.bodySm,
    marginTop: 4,
    color: colors.accentRoseStrong,
    fontWeight: '700',
  },
  pickerContainer: {
    paddingTop: spacing.md,
  },
  pickerActions: {
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
});


