import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Arc, Goal, ThumbnailStyle } from '../domain/types';
import { colors, spacing, typography } from '../theme';
import { HStack, Heading, Text, VStack } from './primitives';
import { Badge } from './Badge';
import { richTextToPlainText } from './richText';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  ARC_TOPO_GRID_SIZE,
  buildArcThumbnailSeed,
  getArcGradient,
  getArcMosaicCell,
  getArcTopoSizes,
  pickThumbnailStyle,
} from '../features/arcs/thumbnailVisuals';

type GoalMasonryTileProps = {
  goal: Goal;
  parentArc?: Arc | null;
  activityCount?: number;
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

export function estimateGoalMasonryTileHeight(params: {
  columnWidth: number;
  aspectBucket: 0 | 1 | 2;
}): number {
  const heroH = Math.max(110, Math.min(params.columnWidth * aspectForBucket(params.aspectBucket), 520));
  // Rough, stable estimate for title + status badge + description + meta.
  const textBlock = 118;
  return heroH + textBlock;
}

export function GoalMasonryTile({
  goal,
  parentArc,
  activityCount = 0,
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
  const topoSizes = getArcTopoSizes(seed);
  const thumbnailStyle = pickThumbnailStyle(
    seed,
    thumbnailStyles && thumbnailStyles.length > 0 ? thumbnailStyles : ['topographyDots']
  );

  const hasCustomThumbnail = Boolean(goal.thumbnailUrl || parentArc?.thumbnailUrl);
  const shouldShowTopography = thumbnailStyle === 'topographyDots' && !hasCustomThumbnail;
  const shouldShowGeoMosaic = thumbnailStyle === 'geoMosaic' && !hasCustomThumbnail;

  const activityLabel =
    activityCount === 0 ? 'No activities' : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`;

  const activityLevel = (goal.forceIntent?.['force-activity'] ?? 0) as number;
  const masteryLevel = (goal.forceIntent?.['force-mastery'] ?? 0) as number;
  const rightMeta = activityLevel + masteryLevel > 0 ? `A ${activityLevel}/3 · M ${masteryLevel}/3` : '';

  const statusLabel = goal.status.replace('_', ' ');
  const statusVariant =
    goal.status === 'in_progress'
      ? 'default'
      : goal.status === 'planned'
        ? 'secondary'
        : 'secondary';

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
            aspectRatio: imageAspectRatio ?? aspectRatioForBucket(bucket),
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

        {shouldShowTopography && (
          <View style={styles.heroOverlay}>
            <View style={styles.topoGrid}>
              {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, rowIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <View key={`goal-tile-topo-row-${rowIndex}`} style={styles.topoRow}>
                  {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, colIndex) => {
                    const cellIndex = rowIndex * ARC_TOPO_GRID_SIZE + colIndex;
                    const rawSize = topoSizes[cellIndex] ?? 0;
                    const isHidden = rawSize < 0;
                    const dotSize = isHidden ? 0 : rawSize;
                    return (
                      // eslint-disable-next-line react/no-array-index-key
                      <View
                        key={`goal-tile-topo-cell-${rowIndex}-${colIndex}`}
                        style={[
                          styles.topoDot,
                          (dotSize === 0 || isHidden) && styles.topoDotSmall,
                          dotSize === 1 && styles.topoDotMedium,
                          dotSize === 2 && styles.topoDotLarge,
                          isHidden && styles.topoDotHidden,
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
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
        <HStack alignItems="center" justifyContent="space-between" style={styles.metaRow}>
          <Badge
            variant="secondary"
            style={styles.activityBadge}
            textStyle={styles.activityBadgeText}
          >
            {activityLabel}
          </Badge>
          <HStack alignItems="center" space="xs" style={styles.metaRight}>
            {rightMeta ? (
              <Text numberOfLines={1} style={styles.metaText}>
                {rightMeta}
              </Text>
            ) : null}
            <Badge variant={statusVariant} style={styles.statusBadge} textStyle={styles.statusBadgeText}>
              {statusLabel}
            </Badge>
          </HStack>
        </HStack>
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
  metaRow: {
    marginTop: spacing.xs,
  },
  metaRight: {
    flexShrink: 0,
    alignItems: 'center',
  },
  metaText: {
    ...typography.bodySm,
    fontSize: 12,
    lineHeight: 16,
    color: colors.sumi800,
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
  topoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  topoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topoDot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  topoDotSmall: {
    width: 3,
    height: 3,
  },
  topoDotMedium: {
    width: 5,
    height: 5,
  },
  topoDotLarge: {
    width: 7,
    height: 7,
  },
  topoDotHidden: {
    opacity: 0,
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


