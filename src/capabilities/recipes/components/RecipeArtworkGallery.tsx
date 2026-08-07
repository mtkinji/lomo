import { useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '../../../theme';
import { Text } from '../../../ui/Typography';
import type { RecipeMediaAsset } from '../domain/recipeContracts';
import { RecipeArtwork } from './RecipeArtwork';

type Props = {
  mediaAssets: RecipeMediaAsset[];
  recipeTitle: string;
  onOpen?(): void;
  fallback?: ReactNode;
  exposeArtworkToAccessibility?: boolean;
  style?: StyleProp<ViewStyle>;
  testID: string;
};

export function RecipeArtworkGallery({
  mediaAssets,
  recipeTitle,
  onOpen,
  fallback,
  exposeArtworkToAccessibility = false,
  style,
  testID,
}: Props) {
  const media = useMemo(
    () => mediaAssets.filter((asset) => asset.lifecycle === 'active'),
    [mediaAssets],
  );
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const first = media[0] ?? null;

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth !== width) setWidth(nextWidth);
  };
  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setActiveIndex(Math.min(media.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width))));
  };

  const hiddenAccessibilityProps = exposeArtworkToAccessibility
    ? {}
    : {
        accessible: false as const,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };

  if (!media.length) {
    return (
      <View testID={testID} style={[styles.frame, style]} {...hiddenAccessibilityProps}>
        {fallback ?? (
          <RecipeArtwork
            accessibilityLabel={`${recipeTitle} recipe artwork`}
            style={styles.artwork}
          />
        )}
      </View>
    );
  }

  if (media.length <= 1) {
    if (!onOpen) {
      return (
        <View testID={testID} style={[styles.frame, style]} {...hiddenAccessibilityProps}>
          <RecipeArtwork
            storageRef={first?.storageRef}
            accessibilityLabel={first?.altText ?? `${recipeTitle} recipe photo`}
            style={styles.artwork}
          />
        </View>
      );
    }
    return (
      <Pressable
        testID={testID}
        onPress={onOpen}
        style={({ pressed }) => [styles.frame, style, pressed && styles.pressed]}
        {...hiddenAccessibilityProps}
      >
        <RecipeArtwork
          storageRef={first?.storageRef}
          accessibilityLabel={first?.altText ?? `${recipeTitle} recipe photo`}
          style={styles.artwork}
        />
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      style={[styles.frame, style]}
      {...hiddenAccessibilityProps}
    >
      {width > 0 ? (
        <ScrollView
          testID={`${testID}-scroll`}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
        >
          {media.map((asset, index) => (
            <Pressable
              key={asset.id}
              testID={`${testID}-photo-${index}`}
              accessible={false}
              onPress={onOpen}
              disabled={!onOpen}
              style={({ pressed }) => [{ width, height: '100%' }, pressed && styles.pressed]}
            >
              <RecipeArtwork
                storageRef={asset.storageRef}
                accessibilityLabel={asset.altText ?? `${recipeTitle} recipe photo ${index + 1}`}
                style={styles.artwork}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <RecipeArtwork
          storageRef={first?.storageRef}
          accessibilityLabel={first?.altText ?? `${recipeTitle} recipe photo`}
          style={styles.artwork}
        />
      )}
      <View pointerEvents="none" style={styles.position}>
        <Text
          variant="label"
          style={styles.positionText}
        >
          {activeIndex + 1} / {media.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.cardMuted },
  artwork: { width: '100%', height: '100%' },
  position: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    minWidth: 38,
    height: 24,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(28,26,25,0.72)',
  },
  positionText: { color: colors.primaryForeground },
  pressed: { opacity: 0.8 },
});
