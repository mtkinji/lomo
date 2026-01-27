import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { HStack, Text, VStack } from '../primitives';
import { WidgetTileChrome } from './WidgetTileChrome';

export type WidgetTileKind = 'activities';
export type WidgetTileSize = 'small' | 'medium' | 'large';

type WidgetTilePreviewProps = {
  kind: WidgetTileKind;
  size: WidgetTileSize;
};

const SAMPLE_ACTIVITIES = [
  { time: 'Sat, Dec 20', title: 'Install the French cleat wall next to…' },
  { time: '', title: 'Move the long stick wood storage…' },
  { time: 'Fri, Dec 19', title: 'Exercise' },
  { time: '', title: 'Put together an automotive toolkit' },
  { time: '', title: 'Model a new workbench' },
  { time: '', title: 'Prep the materials you need' },
  { time: '', title: 'Tidy your workspace (5 min)' },
  { time: '', title: 'Capture any loose thoughts' },
  { time: '', title: 'Choose a single priority' },
  { time: '', title: 'Review your Arc and pick one priority…' },
];

export const WidgetTilePreview = memo(function WidgetTilePreview({ size }: WidgetTilePreviewProps) {
  const listLimit = size === 'small' ? 2 : size === 'medium' ? 5 : 10;
  return (
    <View style={[styles.tileBase, getTileSizeStyle(size)]}>
      <VStack space="md">
        <WidgetTileChrome label="Activities" iconName="checklist" />
        <VStack space="sm">
          {SAMPLE_ACTIVITIES.slice(0, listLimit).map((row) => (
            <HStack key={`${row.time}-${row.title}`} space="sm" alignItems="center">
              <Text style={styles.badge}>○</Text>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {row.title}
              </Text>
              {row.time ? <Text style={styles.timePill}>{row.time}</Text> : null}
            </HStack>
          ))}
        </VStack>
        <View style={styles.flex} />
        <Text style={styles.hint}>23 more</Text>
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
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.md,
  },
  headline: {
    ...typography.titleSm,
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
    width: 66,
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


