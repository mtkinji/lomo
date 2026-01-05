import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { HStack, Text, VStack } from '../primitives';
import { WidgetTileChrome } from './WidgetTileChrome';

export type WidgetTileKind = 'suggested' | 'schedule' | 'momentum';
export type WidgetTileSize = 'small' | 'medium' | 'large';

type WidgetTilePreviewProps = {
  kind: WidgetTileKind;
  size: WidgetTileSize;
};

const SAMPLE_SUGGESTED = [
  { title: 'Write 3 bullet points for your goal quality' },
  { title: 'Schedule a 20-minute Focus block' },
  { title: 'Draft the first “tiny step” Activity' },
  { title: 'Send a quick message to your accountability partner' },
  { title: 'Clear one small blocker you’ve been avoiding' },
  { title: 'Review your Arc and pick one priority for today' },
  { title: 'Do the 10-minute warm-up that gets you started' },
  { title: 'Capture 3 tasks, align later' },
];

const SAMPLE_SCHEDULE = [
  { time: '9:15', title: 'Deep work: outline the next chapter' },
  { time: '11:00', title: 'Walk + reflect on your Arc' },
  { time: 'Anytime', title: 'Send calendar invite for the session' },
  { time: 'Anytime', title: 'Prep the materials you need' },
  { time: '4:30', title: 'Quick review + plan tomorrow' },
  { time: 'Anytime', title: 'Tidy your workspace (5 min)' },
  { time: '6:00', title: 'Stretch + decompress' },
  { time: 'Anytime', title: 'Capture any loose thoughts' },
  { time: '8:30', title: 'Read 10 pages' },
  { time: 'Anytime', title: 'Choose a single priority' },
];

export const WidgetTilePreview = memo(function WidgetTilePreview({ kind, size }: WidgetTilePreviewProps) {
  if (kind === 'momentum') {
    return (
      <View style={[styles.tileBase, getTileSizeStyle(size)]}>
        <VStack space="md">
          <WidgetTileChrome label="Momentum" />
          {size === 'small' ? (
            <VStack space="xs">
              <Text style={styles.metricHero}>2 done today</Text>
              <Text style={styles.metricMeta}>3 day show-up streak</Text>
            </VStack>
          ) : (
            <HStack space="md">
              <VStack space={0} style={styles.metricBox}>
                <Text style={styles.metricLabel}>Done today</Text>
                <Text style={styles.metricValue}>2</Text>
              </VStack>
              <VStack space={0} style={styles.metricBox}>
                <Text style={styles.metricLabel}>This week</Text>
                <Text style={styles.metricValue}>7</Text>
              </VStack>
              <VStack space={0} style={styles.metricBox}>
                <Text style={styles.metricLabel}>Show up</Text>
                <Text style={styles.metricValue}>3d</Text>
              </VStack>
            </HStack>
          )}
          <View style={styles.flex} />
          <Text style={styles.hint}>Tap to open Kwilt</Text>
        </VStack>
      </View>
    );
  }

  if (kind === 'schedule') {
    const first = SAMPLE_SCHEDULE[0];
    const listLimit = size === 'small' ? 1 : size === 'medium' ? 4 : 10;
    return (
      <View style={[styles.tileBase, getTileSizeStyle(size)]}>
        <VStack space="md">
          <WidgetTileChrome label="Schedule" timeLabel={first.time === 'Anytime' ? undefined : first.time} />
          {size === 'small' ? (
            <Text style={styles.headline} numberOfLines={3}>
              {first.title}
            </Text>
          ) : (
            <VStack space="sm">
              {SAMPLE_SCHEDULE.slice(0, listLimit).map((row) => (
                <HStack key={`${row.time}-${row.title}`} space="sm" alignItems="center">
                  <Text style={styles.timePill}>{row.time}</Text>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {row.title}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
          <View style={styles.flex} />
          <Text style={styles.hint}>Tap to open your plan</Text>
        </VStack>
      </View>
    );
  }

  // suggested
  const primary = SAMPLE_SUGGESTED[0];
  const altLimit = size === 'small' ? 1 : size === 'medium' ? 3 : 8;
  return (
    <View style={[styles.tileBase, getTileSizeStyle(size)]}>
      <VStack space="md">
        <WidgetTileChrome label="Suggested next step" timeLabel="9:15" />
        {size === 'small' ? (
          <Text style={styles.headline} numberOfLines={3}>
            {primary.title}
          </Text>
        ) : (
          <VStack space="sm">
            {SAMPLE_SUGGESTED.slice(0, altLimit).map((row, idx) => (
              <HStack key={row.title} space="sm" alignItems="center">
                <Text style={styles.badge}>{idx === 0 ? 'Next' : 'Alt'}</Text>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {row.title}
                </Text>
              </HStack>
            ))}
          </VStack>
        )}
        <View style={styles.flex} />
        <Text style={styles.hint}>Tap to do the next right thing</Text>
      </VStack>
    </View>
  );
});

function getTileSizeStyle(size: WidgetTileSize) {
  if (size === 'medium') {
    return { width: 320, height: 152 } as const;
  }
  if (size === 'large') {
    return { width: 320, height: 320 } as const;
  }
  return { width: 152, height: 152 } as const;
}

const styles = StyleSheet.create({
  tileBase: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
    padding: spacing.md,
  },
  headline: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rowTitle: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
  },
  badge: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    width: 32,
  },
  timePill: {
    ...typography.bodyXs,
    color: colors.textSecondary,
    width: 62,
  },
  hint: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  flex: {
    flex: 1,
  },
  metricHero: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  metricMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  metricBox: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  metricLabel: {
    ...typography.bodyXs,
    color: colors.textSecondary,
  },
  metricValue: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
});


