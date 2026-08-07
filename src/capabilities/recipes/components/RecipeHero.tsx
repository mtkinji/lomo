import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../../../theme';
import type { RecipeMediaAsset } from '../domain/recipeContracts';
import { RecipeArtwork } from './RecipeArtwork';

function displayableUri(asset: RecipeMediaAsset | null): string | null {
  if (!asset || asset.lifecycle !== 'active') return null;
  return /^(https?:|file:|data:)/.test(asset.storageRef) ? asset.storageRef : null;
}

export function RecipeHero({ media, style }: { media: RecipeMediaAsset | null; familyLabel: string | null; style?: StyleProp<ImageStyle> }) {
  const uri = displayableUri(media);
  if (uri || media?.storageRef.startsWith('bundle://')) return <RecipeArtwork accessibilityLabel={media?.altText ?? 'Recipe photo'} storageRef={media?.storageRef} style={[styles.hero, style]} cropZoom={1.04} />;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Recipe artwork"
      style={[styles.hero, style]}
    >
    <LinearGradient
      colors={[colors.pine50, colors.card, colors.shellAlt]}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[StyleSheet.absoluteFillObject, styles.fallback]}
    >
      <View style={styles.tableShadow} />
      <View style={styles.plateOuter}>
        <View style={styles.plateInner}>
          <View style={styles.foodShapePrimary} />
          <View style={styles.foodShapeSecondary} />
          <View style={styles.foodShapeSmall} />
        </View>
      </View>
      <View style={styles.linen} />
    </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 1.5, borderRadius: 24, overflow: 'hidden' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  tableShadow: {
    position: 'absolute',
    width: 232,
    height: 72,
    borderRadius: 116,
    backgroundColor: 'rgba(35, 53, 45, 0.08)',
    transform: [{ translateY: 62 }, { scaleX: 1.08 }],
  },
  plateOuter: {
    width: 206,
    height: 206,
    borderRadius: 103,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(35, 53, 45, 0.08)',
  },
  plateInner: {
    width: 154,
    height: 154,
    borderRadius: 77,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 224, 197, 0.55)',
  },
  foodShapePrimary: {
    width: 92,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(95, 124, 83, 0.72)',
    transform: [{ rotate: '-8deg' }],
  },
  foodShapeSecondary: {
    position: 'absolute',
    width: 68,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(195, 142, 79, 0.65)',
    transform: [{ translateX: 26 }, { translateY: 24 }, { rotate: '18deg' }],
  },
  foodShapeSmall: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(112, 73, 55, 0.42)',
    transform: [{ translateX: -38 }, { translateY: 34 }],
  },
  linen: {
    position: 'absolute',
    right: -24,
    bottom: -34,
    width: 150,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    transform: [{ rotate: '-14deg' }],
  },
});
