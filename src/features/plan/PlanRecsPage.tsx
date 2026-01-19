import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { EmptyState, Heading, HStack, Text, VStack } from '../../ui/primitives';
import { formatTimeRange } from '../../services/plan/planDates';

type PlanRecommendation = {
  activityId: string;
  title: string;
  goalTitle?: string | null;
  arcTitle?: string | null;
  proposal: {
    startDate: string;
    endDate: string;
  };
};

type PlanRecsPageProps = {
  targetDayLabel: string;
  recommendations: PlanRecommendation[];
  emptyState: { title: string; description: string } | null;
  showAlreadyPlanned: boolean;
  entryPoint: 'manual' | 'kickoff';
  calendarStatus: 'unknown' | 'connected' | 'missing';
  onOpenCalendarSettings: () => void;
  onReviewPlan: () => void;
  onRerun: () => void;
  onCommit: (activityId: string) => void;
  onMove: (activityId: string, newStart: Date) => void;
  onSkip: (activityId: string) => void;
  /**
   * Extra padding applied by the page itself. When hosted inside `BottomDrawer`,
   * the drawer already supplies a horizontal gutter, so this should be 0.
   */
  contentPadding?: number;
};

export function PlanRecsPage({
  targetDayLabel,
  recommendations,
  emptyState,
  showAlreadyPlanned,
  entryPoint,
  calendarStatus,
  onOpenCalendarSettings,
  onReviewPlan,
  onRerun,
  onCommit,
  onMove,
  onSkip,
  contentPadding = spacing.xl,
}: PlanRecsPageProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const [pendingMoveDate, setPendingMoveDate] = useState<Date | null>(null);

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
      onMove(pendingMoveId, date);
    }
  };

  if (calendarStatus === 'missing') {
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState
            title="Connect calendars"
            description="Connect Google or Outlook calendars to plan your day and commit time blocks."
          />
          <Button variant="primary" fullWidth onPress={onOpenCalendarSettings} style={styles.cta}>
            Open Calendar Settings
          </Button>
        </View>
      </View>
    );
  }

  if (showAlreadyPlanned) {
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState
            title="Already set"
            description="Your plan for this day is already committed. Review or adjust your blocks."
          />
          <VStack space={spacing.sm} style={styles.emptyActions}>
            <Button variant="primary" fullWidth onPress={onReviewPlan}>
              Review plan
            </Button>
            {entryPoint === 'manual' ? (
              <Button variant="secondary" fullWidth onPress={onRerun}>
                Re-run recommendations
              </Button>
            ) : null}
          </VStack>
        </View>
      </View>
    );
  }

  if (recommendations.length === 0 && emptyState) {
    const showSettingsCta = calendarStatus === 'missing' || emptyState.title === 'Choose a calendar';
    return (
      <View style={[styles.emptyContainer, { padding: contentPadding }]}>
        <View style={styles.emptyContent}>
          <EmptyState title={emptyState.title} description={emptyState.description} />
          {showSettingsCta ? (
            <Button variant="primary" fullWidth onPress={onOpenCalendarSettings} style={styles.cta}>
              Open Calendar Settings
            </Button>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { padding: contentPadding, paddingBottom: spacing.xl * 4 }]}
      showsVerticalScrollIndicator={false}
    >
      <VStack gap={spacing.md}>
        <VStack gap={spacing.xs}>
          <Heading size="sm">Recommendations</Heading>
          <Text style={styles.subtitle}>
            Commit a few for {targetDayLabel}. Everything else stays deferred.
          </Text>
        </VStack>

        <VStack gap={spacing.sm}>
          {recommendations.map((rec) => {
            const start = new Date(rec.proposal.startDate);
            const end = new Date(rec.proposal.endDate);
            const meta = [rec.arcTitle, rec.goalTitle].filter(Boolean).join(' • ');
            return (
              <View key={rec.activityId} style={styles.recCard}>
                <VStack gap={spacing.xs}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  {meta ? <Text style={styles.recMeta}>{meta}</Text> : null}
                  <Text style={styles.recMeta}>{formatTimeRange(start, end)}</Text>
                  <HStack gap={spacing.sm} style={styles.recActions}>
                    <Button variant="primary" size="sm" onPress={() => onCommit(rec.activityId)}>
                      Commit
                    </Button>
                    <Button variant="secondary" size="sm" onPress={() => handleMovePress(rec.activityId, start)}>
                      Move
                    </Button>
                    <Button variant="ghost" size="sm" onPress={() => onSkip(rec.activityId)}>
                      Skip
                    </Button>
                  </HStack>
                </VStack>
              </View>
            );
          })}
        </VStack>

        <View style={styles.deferredCard}>
          <Text style={styles.deferredText}>Everything else stays deferred.</Text>
        </View>
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
  recCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  recMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  recActions: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  deferredCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
  },
  deferredText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyActions: {
    marginTop: spacing.md,
    width: '100%',
  },
  cta: {
    marginTop: spacing.md,
    width: '100%',
    maxWidth: 420,
  },
});
