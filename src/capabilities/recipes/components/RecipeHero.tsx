import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookHeart } from 'lucide-react-native';

import { colors, spacing } from '../../../theme';
import { Text } from '../../../ui/Typography';
import type { RecipeMediaAsset } from '../domain/recipeContracts';
import { RecipeArtwork } from './RecipeArtwork';

function displayableUri(asset: RecipeMediaAsset | null): string | null {
  if (!asset || asset.lifecycle !== 'active') return null;
  return /^(https?:|file:|data:)/.test(asset.storageRef) ? asset.storageRef : null;
}

export function RecipeHero({ media, familyLabel }: { media: RecipeMediaAsset | null; familyLabel: string | null }) {
  const uri = displayableUri(media);
  if (uri || media?.storageRef.startsWith('bundle://')) return <RecipeArtwork accessibilityLabel={media?.altText ?? 'Recipe photo'} storageRef={media?.storageRef} style={styles.hero} />;
  return (
    <LinearGradient colors={[colors.pine50, colors.card]} style={[styles.hero, styles.fallback]}>
      <View style={styles.icon}><BookHeart color={colors.pine700} size={32} /></View>
      <Text variant="label" tone="secondary">{familyLabel ? `From ${familyLabel}` : 'Your recipe'}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 1.5, borderRadius: 24, overflow: 'hidden' },
  fallback: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
});
