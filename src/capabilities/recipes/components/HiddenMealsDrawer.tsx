import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../../theme';
import { BottomDrawer, BottomDrawerScrollView } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { BottomDrawerHeader } from '../../../ui/layout/BottomDrawerHeader';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeProjection } from '../data/recipeCache';
import { RecipeArtwork } from './RecipeArtwork';

export function HiddenMealsDrawer({ visible, recipes, onClose, onRestore }: {
  visible: boolean;
  recipes: readonly RecipeProjection[];
  onClose(): void;
  onRestore(projection: RecipeProjection): void;
}) {
  return (
    <BottomDrawer visible={visible} onClose={onClose} snapPoints={['70%']}>
      <BottomDrawerScrollView contentContainerStyle={styles.content}>
        <BottomDrawerHeader
          title="Hidden meals"
          subtitle="These stay out of your recipe suggestions until you show them again."
          variant="withClose"
          onClose={onClose}
          closeAccessibilityLabel="Close hidden meals"
        />
        {recipes.length ? recipes.map((projection) => {
          const title = projection.currentVersion.title;
          const media = projection.recipe.mediaAssets.find((asset) => asset.lifecycle === 'active');
          return (
            <View key={projection.recipe.id} style={styles.row}>
              <RecipeArtwork
                storageRef={media?.storageRef}
                accessibilityLabel={`${title} artwork`}
                style={styles.artwork}
              />
              <Text numberOfLines={2} style={styles.title}>{title}</Text>
              <Button
                size="sm"
                variant="ghost"
                accessibilityLabel={`Show ${title} again`}
                onPress={() => onRestore(projection)}
              >
                Show again
              </Button>
            </View>
          );
        }) : (
          <View style={styles.empty}>
            <Heading variant="sm">Nothing is hidden.</Heading>
            <Text tone="secondary">Recipes you restore will return to browsing and suggestions.</Text>
          </View>
        )}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  artwork: { width: 56, height: 56, borderRadius: radii.input },
  title: { flex: 1, color: colors.textPrimary },
  empty: { paddingVertical: spacing.lg, gap: spacing.xs },
});
