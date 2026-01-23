import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { cardSurfaceStyle, colors, spacing, typography } from '../../theme';
import { HStack, Heading, Text, VStack } from '../../ui/primitives';
import { IconButton } from '../../ui/Button';
import { formatTimeRange } from '../../services/plan/planDates';
import { Icon } from '../../ui/Icon';
import { Badge } from '../../ui/Badge';

export type ExternalEventPeekModel = {
  title: string;
  start: Date;
  end: Date;
  calendarLabel?: string | null;
  color?: string | null;
  onRequestClose: () => void;
};

export function ExternalEventPeek({ title, start, end, calendarLabel, color, onRequestClose }: ExternalEventPeekModel) {
  const timeText = useMemo(() => formatTimeRange(start, end), [start, end]);
  const dotColor = (color ?? '').trim() || colors.gray400;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Heading style={styles.headerTitle} variant="sm">
          Calendar event
        </Heading>
        <IconButton accessibilityLabel="Close" onPress={onRequestClose} variant="ghost">
          <Icon name="close" size={18} color={colors.textPrimary} />
        </IconButton>
      </View>

      <VStack space={spacing.md}>
        <View style={styles.summaryCard}>
          <VStack space={spacing.xs}>
            <Heading variant="md">{title.trim() || 'Busy'}</Heading>
            <Text style={styles.meta}>{timeText}</Text>
            <HStack space={spacing.sm} alignItems="center" style={{ flexWrap: 'wrap' }}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text style={styles.meta}>{calendarLabel?.trim() ? calendarLabel.trim() : 'External calendar'}</Text>
              <Badge variant="secondary">Read-only</Badge>
            </HStack>
          </VStack>
        </View>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    paddingRight: spacing.md,
  },
  summaryCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    borderRadius: 18,
  },
  meta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
});


