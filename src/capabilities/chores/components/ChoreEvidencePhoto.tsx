import { Pressable } from '@/src/ui/HapticPressable';
import { useState } from 'react';
import { Image, Modal, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '../../../theme';
import { IconButton } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';

const TIDY_SHOES_FIXTURE = require('../assets/tidy-shoes-proof.png') as ImageSourcePropType;

function resolveEvidenceSource(uri: string): ImageSourcePropType {
  return uri === 'fixture://tidy-shoes' ? TIDY_SHOES_FIXTURE : { uri };
}

export function ChoreEvidencePhoto({
  uri,
  childName,
  compact = false,
}: {
  uri: string;
  childName: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const source = resolveEvidenceSource(uri);
  const photoLabel = `${childName}'s chore photo`;

  const resetTransform = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };
  const open = () => {
    resetTransform();
    setExpanded(true);
  };
  const close = () => {
    setExpanded(false);
    resetTransform();
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 1), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });
  const inspectGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${photoLabel}. Open full screen`}
        onPress={open}
        style={({ pressed }) => [
          styles.card,
          compact ? styles.compactCard : styles.receiptCard,
          pressed && styles.pressed,
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          accessible={false}
          source={source}
          resizeMode="cover"
          style={styles.thumbnail}
        />
        <View pointerEvents="none" style={styles.expandBadge}>
          <Icon name="expand" size={15} color={colors.canvas} />
        </View>
      </Pressable>

      <Modal
        visible={expanded}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={close}
      >
        <View style={styles.viewer}>
          <GestureDetector gesture={inspectGesture}>
            <Animated.View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${photoLabel}. Pinch to zoom`}
              style={[styles.viewerImageFrame, imageStyle]}
            >
              <Animated.Image
                accessibilityIgnoresInvertColors
                accessible={false}
                source={source}
                resizeMode="contain"
                style={styles.viewerImage}
              />
            </Animated.View>
          </GestureDetector>
          <IconButton
            accessibilityLabel="Close full-screen chore photo"
            variant="ghost"
            onPress={close}
            style={[
              styles.closeButton,
              { top: insets.top + spacing.sm, right: insets.right + spacing.sm },
            ]}
          >
            <Icon name="close" size={22} color={colors.canvas} />
          </IconButton>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'flex-start',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
    overflow: 'hidden',
  },
  compactCard: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  receiptCard: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  pressed: { opacity: 0.86 },
  expandBadge: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(28,26,25,0.76)',
  },
  viewer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.textPrimary,
  },
  viewerImageFrame: {
    width: '100%',
    height: '100%',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: { position: 'absolute' },
});
