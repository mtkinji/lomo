import { Pressable } from '@/src/ui/HapticPressable';
import { Image, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { Icon } from '../../../ui/Icon';
import { Text } from '../../../ui/Typography';
import type {
  RecipeEditorialPick,
  RecipeEditorialPickThumbnail,
} from '../domain/recipeEditorialPicks';

const THUMBNAILS: Record<RecipeEditorialPickThumbnail, number> = {
  'food-processor': require('../../../../assets/recipes/equipment/kwilt-pick-food-processor.png'),
};

export function RecipeEditorialPickCard({
  pick,
  onPress,
}: {
  pick: RecipeEditorialPick;
  onPress(pick: RecipeEditorialPick): void;
}) {
  const thumbnail = pick.thumbnailUrl
    ? { uri: pick.thumbnailUrl }
    : THUMBNAILS[pick.thumbnailAsset];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${pick.title} on Amazon`}
      onPress={() => onPress(pick)}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <Image
        source={thumbnail}
        accessibilityLabel="Illustration of a compact food processor"
        style={styles.thumbnail}
      />
      <View style={styles.copy}>
        <Text variant="label" numberOfLines={2}>{pick.title}</Text>
        <Text tone="secondary" numberOfLines={2}>{pick.rationale}</Text>
        <Text tone="secondary">
          Useful for {pick.recipeCount} Kwilt {pick.recipeCount === 1 ? 'Recipe' : 'Recipes'}
        </Text>
        <View style={styles.action}>
          <Text variant="label">View on Amazon</Text>
          <Icon name="arrowRight" size={16} color={colors.textPrimary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 120,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radii.card,
    backgroundColor: colors.cardMuted,
  },
  copy: { flex: 1, gap: spacing.xs },
  action: {
    minHeight: 28,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.78 },
});
