import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Arc, Goal, ThumbnailStyle } from '../domain/types';
import { colors, spacing, typography } from '../theme';
import { HStack, Heading, Text, VStack } from './primitives';
import { Badge } from './Badge';
import { Icon, type IconName } from './Icon';
import { richTextToPlainText } from './richText';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  buildArcThumbnailSeed,
  getArcGradient,
  getArcMosaicCell,
  pickThumbnailStyle,
} from '../features/arcs/thumbnailVisuals';

type GoalMasonryTileProps = {
  goal: Goal;
  parentArc?: Arc | null;
  activityCount?: number;
  doneCount?: number;
  nextScheduledLabel?: string | null;
  hasUnscheduledIncomplete?: boolean;
  thumbnailStyles?: ThumbnailStyle[];
  columnWidth: number;
  /**
   * Deterministic bucket controlling the hero aspect ratio. If omitted,
   * the component derives a stable bucket from the goal id.
   */
  aspectBucket?: 0 | 1 | 2;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

function stableBucketFromId(id: string): 0 | 1 | 2 {
  const last = id.charCodeAt(id.length - 1) || 0;
  return (last % 3) as 0 | 1 | 2;
}

function aspectForBucket(bucket: 0 | 1 | 2): number {
  // height / width
  if (bucket === 0) return 0.72;
  if (bucket === 1) return 0.92;
  return 1.18;
}

function aspectRatioForBucket(bucket: 0 | 1 | 2): number {
  // width / height
  return 1 / aspectForBucket(bucket);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function computeFinishByLabel(targetDate?: string): { value: string; color: string } | null {
  if (!targetDate) return null;
  const targetMs = Date.parse(targetDate);
  if (!Number.isFinite(targetMs)) return null;

  const nowMs = Date.now();
  const diffDays = Math.ceil((targetMs - nowMs) / MS_PER_DAY);
  const absDiff = Math.abs(diffDays);

  // When it's close, show a countdown; otherwise show a date label.
  let value: string;
  if (absDiff <= 21) {
    if (diffDays === 0) value = 'Due today';
    else if (diffDays > 0) value = `${diffDays}d left`;
    else value = `${absDiff}d overdue`;
  } else {
    value = new Date(targetMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const color =
    value.includes('overdue')
      ? colors.destructive
      : value.includes('left') || value.includes('Due today')
        ? colors.indigo600
        : colors.sumi800;

  return { value, color };
}

export function estimateGoalMasonryTileHeight(params: {
  columnWidth: number;
  aspectBucket: 0 | 1 | 2;
  hasImage?: boolean;
}): number {
  const heroAspect = params.hasImage ? aspectForBucket(params.aspectBucket) : 1;
  const heroH = Math.max(110, Math.min(params.columnWidth * heroAspect, 520));
  // Rough, stable estimate for title + description + footer rows.
  const textBlock = 118;
  return heroH + textBlock;
}

export function GoalMasonryTile({
  goal,
  parentArc,
  activityCount = 0,
  doneCount = 0,
  nextScheduledLabel = null,
  hasUnscheduledIncomplete = false,
  thumbnailStyles,
  columnWidth,
  aspectBucket,
  style,
  onPress,
}: GoalMasonryTileProps) {
  const bucket = aspectBucket ?? stableBucketFromId(goal.id);
  const [imageAspectRatio, setImageAspectRatio] = React.useState<number | null>(null);
  const imageUri = goal.thumbnailUrl || parentArc?.thumbnailUrl || null;

  React.useEffect(() => {
    let cancelled = false;
    if (!imageUri) {
      setImageAspectRatio(null);
      return;
    }

    // Prefer the actual image dimensions so tiles can vary height naturally (Pinterest feel).
    // `onLoad` can be delayed or not fire in some caching scenarios; `getSize` is more reliable.
    Image.getSize(
      imageUri,
      (width, height) => {
        if (cancelled) return;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
        const ar = width / height;
        setImageAspectRatio((current) => (current && Math.abs(current - ar) < 0.001 ? current : ar));
      },
      () => {
        // If we can't resolve the size, keep the deterministic fallback bucket aspect.
      },
    );

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const seed = buildArcThumbnailSeed(
    goal.id,
    goal.title,
    goal.thumbnailVariant ?? parentArc?.thumbnailVariant ?? null
  );
  const { colors: gradientColors, direction } = getArcGradient(seed);
  const effectiveThumbnailStyles = React.useMemo(
    () => (thumbnailStyles ?? []).filter((style) => style !== 'topographyDots'),
    [thumbnailStyles]
  );
  const thumbnailStyle =
    effectiveThumbnailStyles.length > 0 ? pickThumbnailStyle(seed, effectiveThumbnailStyles) : null;

  const hasCustomThumbnail = Boolean(goal.thumbnailUrl || parentArc?.thumbnailUrl);
  const shouldShowGeoMosaic = thumbnailStyle === 'geoMosaic' && !hasCustomThumbnail;

  const finishBy = React.useMemo(() => {
    if (goal.status === 'completed' || goal.status === 'archived') return null;
    return computeFinishByLabel(goal.targetDate);
  }, [goal.status, goal.targetDate]);

  const nextStep = React.useMemo(() => {
    if (goal.status === 'archived') return null;
    if (goal.status === 'completed') return { label: 'Completed', icon: 'check' as IconName, muted: true };

    if (activityCount === 0) return { label: 'Add first activity', icon: 'plus' as IconName, muted: false };
    if (doneCount >= activityCount && activityCount > 0) {
      return { label: 'Mark complete', icon: 'check' as IconName, muted: false };
    }
    if (goal.status === 'in_progress' && !goal.targetDate)
      return { label: 'Set finish date', icon: 'today' as IconName, muted: false };
    if (finishBy?.value.includes('overdue'))
      return { label: 'Adjust finish date', icon: 'today' as IconName, muted: false };
    if (nextScheduledLabel) return { label: `${nextScheduledLabel}`, icon: 'today' as IconName, muted: false };
    if (hasUnscheduledIncomplete)
      return { label: 'Schedule an activity', icon: 'today' as IconName, muted: false };
    return { label: 'Pick an activity', icon: 'activities' as IconName, muted: false };
  }, [activityCount, doneCount, finishBy?.value, goal.status, goal.targetDate, hasUnscheduledIncomplete, nextScheduledLabel]);

  const description = React.useMemo(() => {
    const raw = goal.description ?? '';
    const plain = richTextToPlainText(raw).trim();
    return plain;
  }, [goal.description]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Open goal: ${goal.title}`}
      style={({ pressed }) => [
        styles.tile,
        { width: columnWidth },
        pressed ? styles.tilePressed : null,
        style,
      ]}
    >
      <View
        style={[
          styles.heroFrame,
          {
            // Default gradients should render as a clean 1:1 square. Only vary the
            // hero aspect ratio when we have a real image to fit.
            aspectRatio: imageUri ? imageAspectRatio ?? aspectRatioForBucket(bucket) : 1,
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.heroImage}
            resizeMode="cover"
            onLoad={(event) => {
              const w = event.nativeEvent.source?.width ?? 0;
              const h = event.nativeEvent.source?.height ?? 0;
              if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
                const ar = w / h;
                setImageAspectRatio((current) => (current && Math.abs(current - ar) < 0.001 ? current : ar));
              }
            }}
          />
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={direction.start}
            end={direction.end}
            style={styles.heroImage}
          />
        )}

        {shouldShowGeoMosaic && (
          <View style={styles.heroOverlay}>
            <View style={styles.mosaicLayer}>
              {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <View key={`goal-tile-mosaic-row-${rowIndex}`} style={styles.mosaicRow}>
                  {Array.from({ length: ARC_MOSAIC_COLS }).map((_, colIndex) => {
                    const cell = getArcMosaicCell(seed, rowIndex, colIndex);
                    if (cell.shape === 0) {
                      return (
                        // eslint-disable-next-line react/no-array-index-key
                        <View key={`goal-tile-mosaic-cell-${rowIndex}-${colIndex}`} style={styles.mosaicCell} />
                      );
                    }
                    const shapeStyle =
                      cell.shape === 2
                        ? styles.mosaicPillVertical
                        : cell.shape === 3
                          ? styles.mosaicPillHorizontal
                          : styles.mosaicCircle;
                    return (
                      // eslint-disable-next-line react/no-array-index-key
                      <View key={`goal-tile-mosaic-cell-${rowIndex}-${colIndex}`} style={styles.mosaicCell}>
                        <View style={[styles.mosaicShapeBase, shapeStyle, { backgroundColor: cell.color }]} />
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <VStack space="xs" style={styles.textBlock}>
        <Heading numberOfLines={2} ellipsizeMode="tail" style={styles.title}>
          {goal.title}
        </Heading>
        {description.length > 0 ? (
          <Text numberOfLines={4} ellipsizeMode="tail" style={styles.description}>
            {description}
          </Text>
        ) : null}
        <VStack space="xs" style={styles.metaBlock}>
          {nextStep ? (
            <Badge
              variant="secondary"
              style={[styles.nextStepCta, nextStep.muted ? styles.nextStepBadgeMuted : null]}
            >
              <HStack space="xs" alignItems="center" style={styles.nextStepRow}>
                <Icon
                  name={nextStep.icon}
                  size={14}
                  color={nextStep.muted ? colors.gray600 : colors.sumi800}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.nextStepCtaText, nextStep.muted ? styles.nextStepBadgeTextMuted : null]}
                >
                  {nextStep.label}
                </Text>
              </HStack>
            </Badge>
          ) : null}
        </VStack>
      </VStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    // No outer "card" shell—Pinterest style prefers floating content.
  },
  tilePressed: {
    opacity: 0.78,
  },
  heroFrame: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.shellAlt,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.bodySm,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  description: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: colors.sumi800,
  },
  metaBlock: {
    marginTop: spacing.xs,
  },
  metaRow: {
    // spacing handled by metaBlock
  },
  activityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.shellAlt,
  },
  activityBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.sumi800,
  },
  nextStepCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.shellAlt,
    borderRadius: 12,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  nextStepRow: {
    flexShrink: 1,
  },
  nextStepBadgeMuted: {
    opacity: 0.8,
  },
  nextStepCtaText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.sumi800,
  },
  nextStepBadgeTextMuted: {
    color: colors.gray600,
  },
  mosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  mosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mosaicCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mosaicShapeBase: {
    borderRadius: 999,
  },
  mosaicCircle: {
    width: '70%',
    height: '70%',
  },
  mosaicPillVertical: {
    width: '55%',
    height: '100%',
  },
  mosaicPillHorizontal: {
    width: '100%',
    height: '55%',
  },
});
