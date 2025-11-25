import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heading, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { Card } from '@/components/ui/card';
import { Icon } from './Icon';
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

type GoalListCardProps = {
  goal: Goal;
  parentArc?: Arc | null;
  activityCount?: number;
  thumbnailStyles?: ThumbnailStyle[];
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function GoalListCard({
  goal,
  parentArc,
  activityCount = 0,
  thumbnailStyles,
  style,
  onPress,
}: GoalListCardProps) {
  const statusLabel = goal.status.replace('_', ' ');
  const activityLabel =
    activityCount === 0
      ? 'No activities yet'
      : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`;

  const seed = buildArcThumbnailSeed(
    parentArc?.id ?? goal.arcId ?? goal.id,
    parentArc?.name ?? goal.title,
    parentArc?.thumbnailVariant
  );

  const { colors: gradientColors, direction } = getArcGradient(seed);
  const topoSizes = getArcTopoSizes(seed);
  const thumbnailStyle = pickThumbnailStyle(seed, thumbnailStyles && thumbnailStyles.length > 0
    ? thumbnailStyles
    : ['topographyDots']);

  const showTopography = thumbnailStyle === 'topographyDots';
  const showGeoMosaic = thumbnailStyle === 'geoMosaic';
  const hasCustomThumbnail = Boolean(parentArc?.thumbnailUrl);
  const shouldShowTopography = showTopography && !hasCustomThumbnail;
  const shouldShowGeoMosaic = showGeoMosaic && !hasCustomThumbnail;

  const content = (
    <Card style={[styles.goalListCard, style]}>
      <View style={styles.goalListContent}>
        <View style={styles.goalThumbnailWrapper}>
          <View style={styles.goalThumbnailInner}>
            {parentArc?.thumbnailUrl ? (
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
          </View>
        </View>
        <VStack style={styles.goalTextContainer}>
          <Heading style={styles.goalTitle} numberOfLines={2} ellipsizeMode="tail">
            {goal.title}
          </Heading>
          <HStack space="md" style={styles.goalMetaRow} alignItems="center">
            <Text style={styles.goalStatus}>{statusLabel}</Text>
            <HStack space="xs" alignItems="center">
              <Icon name="activities" size={14} color={colors.textSecondary} />
              <Text style={styles.goalActivityMeta}>{activityLabel}</Text>
            </HStack>
          </HStack>
        </VStack>
      </View>
    </Card>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  goalListCard: {
    padding: spacing.sm,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  goalListContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 68,
    gap: spacing.md,
  },
  goalThumbnailWrapper: {
    height: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.shellAlt,
    overflow: 'hidden',
    alignSelf: 'stretch',
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


