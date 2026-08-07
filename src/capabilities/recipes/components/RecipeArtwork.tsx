import { useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type LayoutChangeEvent, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Utensils } from 'lucide-react-native';

import { colors } from '../../../theme';
import { getBundledRecipeArtworkIndex } from '../data/starterRecipeCatalog';

const HOUSEHOLD_RECIPE_ATLAS = require('../../../../assets/recipes/household-recipe-atlas.png');
const HOUSEHOLD_RECIPE_ATLAS_2 = require('../../../../assets/recipes/household-recipe-atlas-2.png');

export function RecipeArtwork({
  storageRef,
  accessibilityLabel,
  style,
  cropZoom = 1,
}: {
  storageRef?: string | null;
  accessibilityLabel: string;
  style?: StyleProp<ImageStyle>;
  cropZoom?: number;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const artworkIndex = getBundledRecipeArtworkIndex(storageRef);
  const remoteUri = artworkIndex === null && /^(https?:|file:|data:)/.test(storageRef ?? '') ? storageRef : null;
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  if (remoteUri) {
    return <Image accessibilityLabel={accessibilityLabel} source={{ uri: remoteUri }} resizeMode="cover" style={[styles.frame, style]} />;
  }

  if (artworkIndex !== null) {
    const atlasIndex = artworkIndex % 12;
    const column = atlasIndex % 4;
    const row = Math.floor(atlasIndex / 4);
    const cellSize = Math.max(size.width, size.height) * cropZoom;
    return (
      <View accessibilityLabel={accessibilityLabel} onLayout={onLayout} style={[styles.frame, style]}>
        {size.width > 0 && size.height > 0 ? (
          <Image
            source={artworkIndex < 12 ? HOUSEHOLD_RECIPE_ATLAS : HOUSEHOLD_RECIPE_ATLAS_2}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              width: cellSize * 4,
              height: cellSize * 3,
              left: -column * cellSize + ((size.width - cellSize) / 2),
              top: -row * cellSize + ((size.height - cellSize) / 2),
            }}
          />
        ) : null}
      </View>
    );
  }

  return <View accessibilityLabel={accessibilityLabel} style={[styles.frame, styles.fallback, style]}>
    <LinearGradient colors={[colors.pine50, colors.card]} style={StyleSheet.absoluteFill} />
    <Utensils color={colors.pine700} size={28} />
  </View>;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.pine50 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
