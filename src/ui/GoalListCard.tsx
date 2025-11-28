import React from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/card';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { colors, spacing, typography } from '../theme';
import type { Arc, Goal, ThumbnailStyle } from '../domain/types';
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
import { VStack, HStack, Heading, Text } from './primitives';

type GoalListCardProps = {
  goal: Goal;
  parentArc?: Arc | null;
  activityCount?: number;
  thumbnailStyles?: ThumbnailStyle[];
  /**
   * Optional override for the left-side activity/meta label. When omitted,
   * the component falls back to "No activities yet" / "N activities".
   */
  activityMetaOverride?: string;
  /**
   * Optional override for the right-side status label. When omitted, the
   * component falls back to the goal status ("in progress", "planned", etc).
   */
  statusLabelOverride?: string;
  /**
   * Whether to show the left-side activity/meta cluster. For draft contexts
   * we often hide this so the card feels lighter.
   */
  showActivityMeta?: boolean;
  /**
   * When false, hides the thumbnail block so the card becomes a simple
   * text + meta layout. Used for contexts like draft goals where we want
   * a lighter, less visual treatment.
   */
  showThumbnail?: boolean;
  /**
   * Compact mode relaxes the minimum height constraint so the card can shrink
   * to fit its content, useful for thumbnail-less list items like drafts.
   */
  compact?: boolean;
  /**
   * Optional footer content rendered inside the Card below the meta row. Used
   * for contextual actions (e.g., draft actions) while preserving the shared
   * card shell.
   */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function GoalListCard({
  goal,
  parentArc,
  activityCount = 0,
  thumbnailStyles,
  activityMetaOverride,
  statusLabelOverride,
  showActivityMeta = true,
  showThumbnail = true,
  compact = false,
  children,
  style,
  onPress,
}: GoalListCardProps) {
  const defaultStatusLabel = goal.status.replace('_', ' ');
  const statusLabel = statusLabelOverride ?? defaultStatusLabel;

  const statusVariant =
    goal.status === 'in_progress'
      ? 'default'
      : goal.status === 'planned'
        ? 'secondary'
        : 'secondary';

  const defaultActivityLabel =
    activityCount === 0
      ? 'No activities yet'
      : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`;
  const activityLabel = activityMetaOverride ?? defaultActivityLabel;

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

  const showTopography = thumbnailStyle === 'topographyDots';
  const showGeoMosaic = thumbnailStyle === 'geoMosaic';
  const showContourRings = thumbnailStyle === 'contourRings';
  const showPixelBlocks = thumbnailStyle === 'pixelBlocks';
  const hasCustomThumbnail = Boolean(goal.thumbnailUrl || parentArc?.thumbnailUrl);
  const shouldShowTopography = showTopography && !hasCustomThumbnail;
  const shouldShowGeoMosaic = showGeoMosaic && !hasCustomThumbnail;
  const shouldShowContourRings = showContourRings && !hasCustomThumbnail;
  const shouldShowPixelBlocks = showPixelBlocks && !hasCustomThumbnail;

  const content = (
    <Card style={[styles.goalListCard, style]}>
      <VStack
        style={[styles.goalListContent, compact && styles.goalListContentCompact]}
        space="xs"
      >
        <HStack style={styles.goalTopRow} space="md">
          {showThumbnail && (
            <View style={styles.goalThumbnailWrapper}>
              <View style={styles.goalThumbnailInner}>
                {goal.thumbnailUrl ? (
                  <Image
                    source={{ uri: goal.thumbnailUrl }}
                    style={styles.goalThumbnail}
                    resizeMode="cover"
                  />
                ) : parentArc?.thumbnailUrl ? (
                  <Image
                    source={{ uri: parentArc.thumbnailUrl }}
                    style={styles.goalThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={gradientColors}
                    start={direction.start}
                    end={direction.end}
                    style={styles.goalThumbnailGradient}
                  />
                )}
                {shouldShowTopography && (
                  <View style={styles.goalTopoLayer}>
                    <View style={styles.goalTopoGrid}>
                      {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, rowIndex) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <View key={`goal-topo-row-${rowIndex}`} style={styles.goalTopoRow}>
                          {Array.from({ length: ARC_TOPO_GRID_SIZE }).map((_, colIndex) => {
                            const cellIndex = rowIndex * ARC_TOPO_GRID_SIZE + colIndex;
                            const rawSize = topoSizes[cellIndex] ?? 0;
                            const isHidden = rawSize < 0;
                            const dotSize = isHidden ? 0 : rawSize;
                            return (
                              // eslint-disable-next-line react/no-array-index-key
                              <View
                                key={`goal-topo-cell-${rowIndex}-${colIndex}`}
                                style={[
                                  styles.goalTopoDot,
                                  (dotSize === 0 || isHidden) && styles.goalTopoDotSmall,
                                  dotSize === 1 && styles.goalTopoDotMedium,
                                  dotSize === 2 && styles.goalTopoDotLarge,
                                  isHidden && styles.goalTopoDotHidden,
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
                  <View style={styles.goalMosaicLayer}>
                    {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <View key={`goal-mosaic-row-${rowIndex}`} style={styles.goalMosaicRow}>
                        {Array.from({ length: ARC_MOSAIC_COLS }).map((_, colIndex) => {
                          const cell = getArcMosaicCell(seed, rowIndex, colIndex);
                          if (cell.shape === 0) {
                            return (
                              // eslint-disable-next-line react/no-array-index-key
                              <View
                                key={`goal-mosaic-cell-${rowIndex}-${colIndex}`}
                                style={styles.goalMosaicCell}
                              />
                            );
                          }

                          let shapeStyle: StyleProp<ViewStyle> = styles.goalMosaicCircle;
                          if (cell.shape === 2) {
                            shapeStyle = styles.goalMosaicPillVertical;
                          } else if (cell.shape === 3) {
                            shapeStyle = styles.goalMosaicPillHorizontal;
                          }

                          return (
                            // eslint-disable-next-line react/no-array-index-key
                            <View
                              key={`goal-mosaic-cell-${rowIndex}-${colIndex}`}
                              style={styles.goalMosaicCell}
                            >
                              <View
                                style={[
                                  styles.goalMosaicShapeBase,
                                  shapeStyle,
                                  { backgroundColor: cell.color },
                                ]}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}
                {shouldShowContourRings && (
                  <View style={styles.goalContourLayer}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <View
                        key={`goal-contour-ring-${index}`}
                        style={[
                          styles.goalContourRing,
                          {
                            margin: 3 + index * 2,
                            borderColor: `rgba(15,23,42,${0.18 + index * 0.07})`,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
                {shouldShowPixelBlocks && (
                  <View style={styles.goalPixelLayer}>
                    {Array.from({ length: ARC_MOSAIC_ROWS }).map((_, rowIndex) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <View
                        key={`goal-pixel-row-${rowIndex}`}
                        style={styles.goalPixelRow}
                      >
                        {Array.from({ length: ARC_MOSAIC_COLS }).map((_, colIndex) => {
                          const filled = (rowIndex + colIndex) % 2 === 0;
                          return (
                            // eslint-disable-next-line react/no-array-index-key
                            <View
                              key={`goal-pixel-${rowIndex}-${colIndex}`}
                              style={[
                                styles.goalPixelCell,
                                filled && styles.goalPixelCellFilled,
                              ]}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
          <VStack style={styles.goalTextContainer}>
            <Heading style={styles.goalTitle} numberOfLines={2} ellipsizeMode="tail">
              {goal.title}
            </Heading>
          </VStack>
        </HStack>

        {showActivityMeta && (
          <HStack
            space="md"
            style={styles.goalMetaRow}
            alignItems="center"
            justifyContent="space-between"
          >
            <HStack space="xs" alignItems="center">
              <Icon name="activities" size={14} color={colors.textSecondary} />
              <Text style={styles.goalActivityMeta}>{activityLabel}</Text>
            </HStack>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </HStack>
        )}

        {children}
      </VStack>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  goalListCard: {
    marginHorizontal: 0,
    marginVertical: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  goalListContent: {
    flexDirection: 'column',
    minHeight: 68,
    justifyContent: 'space-between',
  },
  goalListContentCompact: {
    minHeight: 0,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  goalThumbnailWrapper: {
    // Sized to roughly match two lines of title text while staying on the 8px grid.
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
  },
  goalThumbnailInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  goalThumbnail: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  goalTopoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTopoGrid: {
    width: '100%',
    height: '100%',
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  goalTopoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalTopoDot: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  goalTopoDotSmall: {
    width: 3,
    height: 3,
  },
  goalTopoDotMedium: {
    width: 5,
    height: 5,
  },
  goalTopoDotLarge: {
    width: 7,
    height: 7,
  },
  goalTopoDotHidden: {
    opacity: 0,
  },
  goalMosaicLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  goalMosaicRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalMosaicCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMosaicShapeBase: {
    borderRadius: 999,
  },
  goalMosaicCircle: {
    width: '70%',
    height: '70%',
  },
  goalMosaicPillVertical: {
    width: '55%',
    height: '100%',
  },
  goalMosaicPillHorizontal: {
    width: '100%',
    height: '55%',
  },
  goalContourLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalContourRing: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
    borderColor: 'rgba(15,23,42,0.2)',
    ...StyleSheet.absoluteFillObject,
  },
  goalPixelLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  goalPixelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalPixelCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 0.5,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.15)',
  },
  goalPixelCellFilled: {
    backgroundColor: '#1D4ED8',
  },
  goalTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  goalTitle: {
    ...typography.body,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
  },
  goalMetaRow: {
    marginTop: spacing.xs / 2,
  },
  goalStatus: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  goalActivityMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


