import React from 'react';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, type CardPadding } from './Card';
import { Icon } from './Icon';
import { Badge } from './Badge';
import { colors, spacing, typography } from '../theme';
import type { Arc, Goal, ThumbnailStyle } from '../domain/types';
import {
  ARC_MOSAIC_COLS,
  ARC_MOSAIC_ROWS,
  buildArcThumbnailSeed,
  getArcGradient,
  getArcMosaicCell,
  pickThumbnailStyle,
} from '../features/arcs/thumbnailVisuals';
import { VStack, HStack, Heading, Text } from './primitives';
import { getGoalStatusAppearance } from './goalStatusAppearance';

type GoalListCardProps = {
  goal: Goal;
  parentArc?: Arc | null;
  activityCount?: number;
  thumbnailStyles?: ThumbnailStyle[];
  /**
   * Visual container style.
   * - 'card' (default): uses the shared Card shell.
   * - 'flat': renders as a lightweight list row (no card border/background).
   */
  variant?: 'card' | 'flat';
  /**
   * Card shell padding preset (delegated to the shared `Card` primitive).
   */
  padding?: CardPadding;
  /**
   * Visual density preset. `dense` compacts thumbnail, typography, and spacing
   * for tighter object canvases.
   */
  density?: 'default' | 'dense';
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
  /**
   * Optional label rendered inside the text column directly above the goal
   * title. Used for lightweight annotations like "AI recommendation" while
   * keeping the shared goal card shell.
   */
  headerLabel?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function GoalListCard({
  goal,
  parentArc,
  activityCount = 0,
  thumbnailStyles,
  variant = 'card',
  padding = 'md',
  density = 'default',
  activityMetaOverride,
  statusLabelOverride,
  showActivityMeta = true,
  showThumbnail = true,
  compact = false,
  children,
  headerLabel,
  style,
  onPress,
}: GoalListCardProps) {
  const statusAppearance = getGoalStatusAppearance(goal.status);
  const statusLabel = statusLabelOverride ?? statusAppearance.label;
  const isDense = density === 'dense';
  const shouldCenterTitleWithThumbnail =
    variant === 'flat' && showThumbnail && !showActivityMeta && !headerLabel;

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
  const effectiveThumbnailStyles = React.useMemo(
    () => (thumbnailStyles ?? []).filter((style) => style !== 'topographyDots'),
    [thumbnailStyles]
  );
  const thumbnailStyle =
    effectiveThumbnailStyles.length > 0 ? pickThumbnailStyle(seed, effectiveThumbnailStyles) : null;

  const showGeoMosaic = thumbnailStyle === 'geoMosaic';
  const showContourRings = thumbnailStyle === 'contourRings';
  const showPixelBlocks = thumbnailStyle === 'pixelBlocks';
  const hasCustomThumbnail = Boolean(goal.thumbnailUrl || parentArc?.thumbnailUrl);
  const shouldShowGeoMosaic = showGeoMosaic && !hasCustomThumbnail;
  const shouldShowContourRings = showContourRings && !hasCustomThumbnail;
  const shouldShowPixelBlocks = showPixelBlocks && !hasCustomThumbnail;

  const inner = (
    <VStack
      style={[
        styles.goalListContent,
        compact && styles.goalListContentCompact,
        isDense && styles.goalListContentDense,
        variant === 'flat' && styles.goalListContentFlat,
      ]}
      space="xs"
    >
      <HStack
        style={[styles.goalTopRow, shouldCenterTitleWithThumbnail && styles.goalTopRowCentered]}
        space={isDense ? 'sm' : 'md'}
      >
          {showThumbnail && (
            <View style={[styles.goalThumbnailWrapper, isDense && styles.goalThumbnailWrapperDense]}>
              <View style={[styles.goalThumbnailInner, isDense && styles.goalThumbnailInnerDense]}>
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
          <VStack
            style={[
              styles.goalTextContainer,
              shouldCenterTitleWithThumbnail && styles.goalTextContainerCentered,
            ]}
          >
            {headerLabel}
            <Heading
              style={[styles.goalTitle, isDense && styles.goalTitleDense]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {goal.title}
            </Heading>
          </VStack>
        </HStack>

        {showActivityMeta && (
          <HStack
            space={isDense ? 'sm' : 'md'}
            style={[styles.goalMetaRow, isDense && styles.goalMetaRowDense]}
            alignItems="center"
            justifyContent="space-between"
          >
            <HStack space="xs" alignItems="center">
              <Icon name="activities" size={isDense ? 12 : 14} color={colors.textSecondary} />
              <Text style={styles.goalActivityMeta}>{activityLabel}</Text>
            </HStack>
            <Badge
              variant="secondary"
              style={[
                { backgroundColor: statusAppearance.badgeBackgroundColor },
                isDense ? styles.goalBadgeDense : undefined,
              ]}
              textStyle={[
                { color: statusAppearance.badgeTextColor },
                isDense ? styles.goalBadgeTextDense : undefined,
              ]}
            >
              {statusLabel}
            </Badge>
          </HStack>
        )}

        {children}
    </VStack>
  );

  const container =
    variant === 'flat' ? (
      <View
        style={[
          styles.goalListFlat,
          isDense && styles.goalListFlatDense,
          style,
        ]}
      >
        {inner}
      </View>
    ) : (
      <Card padding={padding} style={[styles.goalListCard, style]}>
        {inner}
      </Card>
    );

  if (!onPress) return container;

  return <Pressable onPress={onPress}>{container}</Pressable>;
}

const styles = StyleSheet.create({
  goalListCard: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  goalListFlat: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
  },
  goalListFlatDense: {
    paddingVertical: spacing.xs,
  },
  goalListContent: {
    flexDirection: 'column',
    minHeight: 68,
    justifyContent: 'space-between',
  },
  goalListContentFlat: {
    minHeight: 0,
  },
  goalListContentCompact: {
    minHeight: 0,
  },
  goalListContentDense: {
    minHeight: 0,
  },
  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  goalTopRowCentered: {
    alignItems: 'center',
  },
  goalThumbnailWrapper: {
    // Sized to roughly match two lines of title text while staying on the 8px grid.
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
  },
  goalThumbnailWrapperDense: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  goalThumbnailInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  goalThumbnailInnerDense: {
    borderRadius: 10,
  },
  goalThumbnail: {
    width: '100%',
    height: '100%',
  },
  goalThumbnailGradient: {
    ...StyleSheet.absoluteFillObject,
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
  goalTextContainerCentered: {
    justifyContent: 'center',
  },
  goalTitle: {
    ...typography.body,
    fontFamily: typography.titleSm.fontFamily,
    color: colors.textPrimary,
  },
  goalTitleDense: {
    ...typography.bodySm,
    fontFamily: typography.titleSm.fontFamily,
  },
  goalMetaRow: {
    marginTop: spacing.xs / 2,
  },
  goalMetaRowDense: {
    marginTop: 0,
  },
  goalBadgeDense: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  goalBadgeTextDense: {
    fontSize: 12,
    lineHeight: 16,
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


