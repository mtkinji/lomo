import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/card';
import { Icon } from './Icon';
import { colors, spacing, typography } from '../theme';
import type { Arc } from '../domain/types';
import { buildArcThumbnailSeed, getArcGradient } from '../features/arcs/thumbnailVisuals';
import { HStack, Text } from './primitives';

type ArcListCardProps = {
  arc: Arc;
  /**
   * Optional count of goals attached to this arc, used for a small meta row
   * under the title. When omitted, the count pill is hidden.
   */
  goalCount?: number;
  style?: StyleProp<ViewStyle>;
};

export function ArcListCard({ arc, goalCount, style }: ArcListCardProps) {
  const seed = buildArcThumbnailSeed(arc.id, arc.name, arc.thumbnailVariant);
  const { colors: gradientColors, direction } = getArcGradient(seed);

  const showStatusPill = arc.status !== 'active';
  const statusLabel =
    arc.status === 'active' ? 'Active arc' : arc.status.replace('_', ' ');

  const goalCountLabel =
    typeof goalCount === 'number'
      ? goalCount === 0
        ? 'No goals yet'
        : `${goalCount} ${goalCount === 1 ? 'goal' : 'goals'}`
      : null;

  return (
    <Card style={[styles.card, style]}>
      {/* Hero banner lives at the top of the Card and mirrors the card radius so
          gradients and thumbnails feel seamlessly inset into the container. */}
      <View style={styles.heroInner}>
        {arc.thumbnailUrl ? (
          <Image
            source={{ uri: arc.thumbnailUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={direction.start}
            end={direction.end}
            style={styles.heroImage}
          />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.bodyContent}>
          <Text numberOfLines={2} style={styles.title}>
            {arc.name}
          </Text>
          {arc.narrative ? (
            <Text numberOfLines={2} style={styles.narrative}>
              {arc.narrative}
            </Text>
          ) : null}
        </View>

        {(goalCountLabel || showStatusPill) && (
          <HStack space="sm" alignItems="center" style={styles.metaRow}>
            {goalCountLabel ? (
              <HStack space="xs" alignItems="center">
                <Icon name="goals" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{goalCountLabel}</Text>
              </HStack>
            ) : null}
            {showStatusPill && (
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            )}
          </HStack>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
    marginBottom: 0,
  },
  heroInner: {
    width: '100%',
    // Flatter banner so the Arc text has more room to breathe below.
    // 3:1 is a common hero ratio for cards.
    aspectRatio: 3 / 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    flexDirection: 'column',
    // Ensure the text block and meta row use the full vertical space so the
    // meta row visually anchors to the bottom of the card.
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bodyContent: {
    gap: spacing.xs,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  narrative: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metaRow: {
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  statusPill: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.shellAlt,
  },
  statusText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


