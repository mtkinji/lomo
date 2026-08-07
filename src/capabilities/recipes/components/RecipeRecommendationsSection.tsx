import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeRecommendation } from '../domain/recipeRecommendations';
import { RecipeArtwork } from './RecipeArtwork';

export function RecipeRecommendationsSection({
  recommendations,
  onOpenRecipe,
}: {
  recommendations: RecipeRecommendation[];
  onOpenRecipe(recipeId: string): void;
}) {
  if (!recommendations.length) return null;

  return (
    <View style={styles.section}>
      <Heading variant="md">More Meals you might like</Heading>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {recommendations.map(({ projection, reason }) => {
          const media = projection.recipe.mediaAssets.find(
            (asset) => asset.lifecycle === 'active',
          );
          return (
            <Pressable
              key={projection.recipe.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${projection.currentVersion.title}. ${reason.label}`}
              onPress={() => onOpenRecipe(projection.recipe.id)}
              style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
            >
              <RecipeArtwork
                storageRef={media?.storageRef}
                accessibilityLabel={media?.altText ?? `${projection.currentVersion.title} recipe artwork`}
                style={styles.artwork}
              />
              <View style={styles.copy}>
                <Text variant="label" numberOfLines={2} style={styles.title}>
                  {projection.currentVersion.title}
                </Text>
                <View style={styles.reason}>
                  <Icon name={reason.icon} size={14} color={colors.textSecondary} />
                  <Text tone="secondary" numberOfLines={1} style={styles.reasonText}>
                    {reason.label}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.lg,
  },
  rail: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  item: {
    width: 224,
    gap: spacing.sm,
  },
  artwork: {
    width: 224,
    height: 148,
    borderRadius: radii.card,
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reasonText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.78,
  },
});
