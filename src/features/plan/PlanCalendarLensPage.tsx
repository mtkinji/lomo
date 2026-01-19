import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { Activity } from '../../domain/types';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import { formatTimeRange } from '../../services/plan/planDates';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { EmptyState, Heading, HStack, Text, VStack } from '../../ui/primitives';

type KwiltBlock = {
  activity: Activity;
  start: Date;
  end: Date;
};

type PlanCalendarLensPageProps = {
  targetDayLabel: string;
  externalBusyIntervals: BusyInterval[];
  proposedBlocks: Array<{ title: string; start: Date; end: Date }>;
  kwiltBlocks: KwiltBlock[];
  conflictActivityIds: string[];
  calendarStatus: 'unknown' | 'connected' | 'missing';
  availabilitySummary: string[];
  onOpenCalendarSettings: () => void;
  onMoveCommitment: (activityId: string, newStart: Date) => void;
  /**
   * Extra padding applied by the page itself. When hosted inside `BottomDrawer`,
   * the drawer already supplies a horizontal gutter, so this should be 0.
   */
  contentPadding?: number;
};

export function PlanCalendarLensPage({
  targetDayLabel,
  externalBusyIntervals,
  proposedBlocks,
  kwiltBlocks,
  conflictActivityIds,
  calendarStatus,
  availabilitySummary,
  onOpenCalendarSettings,
  onMoveCommitment,
  contentPadding = spacing.xl,
}: PlanCalendarLensPageProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const [pendingMoveDate, setPendingMoveDate] = useState<Date | null>(null);

  const sortedExternal = useMemo(
    () =>
      [...externalBusyIntervals].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [externalBusyIntervals],
  );

  const sortedKwilt = useMemo(
    () => [...kwiltBlocks].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [kwiltBlocks],
  );

  const sortedProposals = useMemo(
    () => [...proposedBlocks].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [proposedBlocks],
  );

  const handleMovePress = (activityId: string, start: Date) => {
    setPendingMoveId(activityId);
    setPendingMoveDate(start);
    setPickerVisible(true);
  };

  const handleMoveChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') {
      setPickerVisible(false);
    }
    if (date && pendingMoveId) {
      onMoveCommitment(pendingMoveId, date);
    }
  };

  if (calendarStatus === 'missing') {
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState
            title="Connect calendars"
            description="Connect calendars to show your day and move commitments."
          />
          <Button variant="primary" fullWidth onPress={onOpenCalendarSettings} style={styles.cta}>
            Open Calendar Settings
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: contentPadding, paddingBottom: spacing.xl * 4 }]}
      showsVerticalScrollIndicator={false}
    >
      <VStack space={spacing.md}>
        <VStack space={spacing.xs}>
          <Heading size="sm">Calendar Lens</Heading>
          <Text style={styles.subtitle}>Busy and free time for {targetDayLabel}.</Text>
        </VStack>

        {availabilitySummary.length > 0 ? (
          <View style={styles.availabilityCard}>
            <VStack space="xs">
              <Text style={styles.availabilityTitle}>Availability</Text>
              {availabilitySummary.map((line) => (
                <Text key={line} style={styles.availabilityText}>
                  {line}
                </Text>
              ))}
            </VStack>
          </View>
        ) : null}

        <VStack space={spacing.sm}>
          <Text style={styles.sectionTitle}>Busy time</Text>
          {sortedExternal.length === 0 ? (
            <Text style={styles.sectionEmpty}>No external events</Text>
          ) : (
            sortedExternal.map((e) => {
              const start = e.start;
              const end = e.end;
              return (
                <View key={`${start.toISOString()}-${end.toISOString()}`} style={styles.eventCard}>
                  <HStack gap={spacing.sm} alignItems="center">
                    <Icon name="today" size={14} color={colors.textSecondary} />
                    <Text style={styles.eventTitle}>Busy</Text>
                  </HStack>
                  <Text style={styles.eventMeta}>{formatTimeRange(start, end)}</Text>
                </View>
              );
            })
          )}
        </VStack>

        <VStack space={spacing.sm}>
          <Text style={styles.sectionTitle}>Proposed blocks</Text>
          {sortedProposals.length === 0 ? (
            <Text style={styles.sectionEmpty}>No proposals yet</Text>
          ) : (
            sortedProposals.map((block) => (
              <View key={`${block.title}-${block.start.toISOString()}`} style={styles.eventCard}>
                <HStack gap={spacing.sm} alignItems="center">
                  <Icon name="plan" size={14} color={colors.textSecondary} />
                  <Text style={styles.eventTitle}>{block.title}</Text>
                </HStack>
                <Text style={styles.eventMeta}>{formatTimeRange(block.start, block.end)}</Text>
              </View>
            ))
          )}
        </VStack>

        <VStack space={spacing.sm}>
          <Text style={styles.sectionTitle}>Kwilt blocks</Text>
          {sortedKwilt.length === 0 ? (
            <Text style={styles.sectionEmpty}>No commitments yet</Text>
          ) : (
            sortedKwilt.map((block) => {
              const conflict = conflictActivityIds.includes(block.activity.id);
              return (
                <View
                  key={block.activity.id}
                  style={[
                    styles.eventCard,
                    conflict ? styles.eventCardConflict : null,
                  ]}
                >
                  <VStack space={spacing.xs}>
                    <HStack gap={spacing.sm} alignItems="center">
                      <Icon name="daily" size={14} color={colors.textSecondary} />
                      <Text style={styles.eventTitle}>{block.activity.title}</Text>
                    </HStack>
                    <Text style={styles.eventMeta}>{formatTimeRange(block.start, block.end)}</Text>
                    {conflict ? (
                      <Text style={styles.conflictText}>Conflicts with your calendar</Text>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => handleMovePress(block.activity.id, block.start)}
                    >
                      Move
                    </Button>
                  </VStack>
                </View>
              );
            })
          )}
        </VStack>
      </VStack>

      {pickerVisible && pendingMoveDate ? (
        <DateTimePicker
          value={pendingMoveDate}
          mode="time"
          onChange={handleMoveChange}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    paddingBottom: 0,
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
  availabilityCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  availabilityTitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  availabilityText: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionEmpty: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventCardConflict: {
    borderColor: colors.accentRoseStrong,
  },
  eventTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  eventMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  conflictText: {
    ...typography.bodySm,
    color: colors.accentRoseStrong,
  },
  cta: {
    marginTop: spacing.md,
    width: '100%',
    maxWidth: 420,
  },
});


