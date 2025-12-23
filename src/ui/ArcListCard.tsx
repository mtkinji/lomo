import React, { type ReactNode } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from './Card';
import { Icon } from './Icon';
import { colors, spacing, typography } from '../theme';
import type { Arc } from '../domain/types';
import { buildArcThumbnailSeed, getArcGradient } from '../features/arcs/thumbnailVisuals';
import { HStack, Text } from './primitives';
import { richTextToPlainText } from './richText';

type ArcListCardProps = {
  arc: Arc;
  /**
   * Optional count of goals attached to this arc, used for a small meta row
   * under the title. When omitted, the count pill is hidden.
   */
  goalCount?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional tone override for the narrative text. The default matches the
   * Arcs canvas (secondary text). A "strong" tone uses the primary text
   * color, which is helpful for onboarding reveals where the Arc description
   * is the main content.
   */
  narrativeTone?: 'default' | 'strong';
  /**
   * When true, render the full narrative without truncation. Defaults to a
   * compact two-line snippet for list views.
   */
  showFullNarrative?: boolean;
  /**
   * Optional custom narrative renderer. When provided, this content is rendered
   * in place of the default single Text block, but still inside the same card
   * layout. Useful for onboarding reveals where we want multi-paragraph
   * layouts or additional emphasis without changing the stored Arc text.
   */
  customNarrative?: ReactNode;
};

export function ArcListCard({
  arc,
  goalCount,
  style,
  narrativeTone = 'default',
  showFullNarrative = false,
  customNarrative,
}: ArcListCardProps) {
  const seed = buildArcThumbnailSeed(arc.id, arc.name, arc.thumbnailVariant);
  const { colors: gradientColors, direction } = getArcGradient(seed);

  const isHeroHidden = arc.heroHidden;

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
    <Card padding="none" style={[styles.card, style]}>
      {/* Hero banner lives at the top of the Card and mirrors the card radius so
          gradients and thumbnails feel seamlessly inset into the container. */}
      <View style={styles.heroInner}>
        {isHeroHidden ? (
          <View style={styles.heroMinimal} />
        ) : arc.thumbnailUrl ? (
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
          {customNarrative
            ? customNarrative
            : arc.narrative && (
                <Text
                  numberOfLines={showFullNarrative ? undefined : 2}
                  style={[
                    styles.narrative,
                    narrativeTone === 'strong' && styles.narrativeStrong,
                  ]}
                >
                  {richTextToPlainText(arc.narrative)}
                </Text>
              )}
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
    padding: spacing.sm,
  },
  heroInner: {
    width: '100%',
    // Flatter banner so the Arc text has more room to breathe below.
    // 3:1 is a common hero ratio for cards.
    aspectRatio: 12 / 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroMinimal: {
    flex: 1,
    backgroundColor: colors.shellAlt,
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
    // Inset the text and meta rows from the card edges while keeping the
    // hero banner flush with the container above.
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
  narrativeStrong: {
    color: colors.textPrimary,
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


