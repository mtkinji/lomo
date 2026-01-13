import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ActivityListItem } from './ActivityListItem';
import type { IconName } from './Icon';
import { HapticsService } from '../services/HapticsService';

type DraggableActivityListItemProps = {
  /**
   * Visual density / information level.
   */
  variant?: 'compact' | 'full';
  title: string;
  meta?: string;
  notes?: string;
  metaLeadingIconName?: IconName;
  metaLeadingIconNames?: Array<IconName>;
  metaLoading?: boolean;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  isPriorityOne?: boolean;
  onTogglePriority?: () => void;
  showPriorityControl?: boolean;
  onPress?: () => void;
  /**
   * Callback from DraggableFlatList to initiate drag.
   * Long-press triggers this.
   */
  drag: () => void;
  /**
   * Whether this item is currently being dragged.
   */
  isActive: boolean;
};

/**
 * Wrapper around ActivityListItem that adds drag-and-drop support
 * for use with react-native-draggable-flatlist.
 *
 * - Long-press activates drag mode via the `drag` callback
 * - Visual feedback (scale/shadow) when `isActive`
 * - Haptic feedback on drag start
 */
export function DraggableActivityListItem({
  drag,
  isActive,
  ...itemProps
}: DraggableActivityListItemProps) {
  const didTriggerHapticRef = React.useRef(false);

  // Trigger haptic feedback when drag starts
  React.useEffect(() => {
    if (isActive && !didTriggerHapticRef.current) {
      didTriggerHapticRef.current = true;
      void HapticsService.trigger('canvas.selection');
    }
    if (!isActive) {
      didTriggerHapticRef.current = false;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isActive ? 1.03 : 1, {
            damping: 20,
            stiffness: 300,
          }),
        },
      ],
      shadowOpacity: withSpring(isActive ? 0.15 : 0, {
        damping: 20,
        stiffness: 300,
      }),
      zIndex: isActive ? 999 : 0,
    };
  }, [isActive]);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <ActivityListItem
        {...itemProps}
        onPress={() => {
          // Only trigger onPress if not in drag mode
          if (!isActive && itemProps.onPress) {
            itemProps.onPress();
          }
        }}
        // Override the pressable behavior to enable long-press for drag
        onLongPress={drag}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    // shadowOpacity is animated
  },
});

