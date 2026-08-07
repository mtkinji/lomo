import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { floatingControl, spacing } from '../theme';
import {
  ActionDockSplitContent,
  type ActionDockSplitAction,
} from './ActionDockSplitContent';

type Props<Id extends string> = {
  recommendedAction: ActionDockSplitAction<Id>;
  menuActions: ActionDockSplitAction<Id>[];
  onActionPress: (actionId: Id, source: 'primary' | 'menu') => void;
  disabledActionIds?: Partial<Record<Id, boolean>>;
  menuAccessibilityLabel: string;
  primaryTestID?: string;
  menuTriggerTestID?: string;
  getMenuTestID?: (actionId: Id) => string | undefined;
  targetRef?: React.RefObject<View | null>;
  insetX?: number;
  insetBottom?: number;
  safeAreaLift?: 'none' | 'half' | 'full';
  style?: StyleProp<ViewStyle>;
  onLayout?: ViewProps['onLayout'];
};

export function SplitActionDock<Id extends string>({
  recommendedAction,
  menuActions,
  onActionPress,
  disabledActionIds,
  menuAccessibilityLabel,
  primaryTestID,
  menuTriggerTestID,
  getMenuTestID,
  targetRef,
  insetX = spacing.xl,
  insetBottom = 16,
  safeAreaLift = 'half',
  style,
  onLayout,
}: Props<Id>) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[
        styles.host,
        {
          paddingHorizontal: insetX,
          bottom:
            (safeAreaLift === 'full'
              ? insets.bottom
              : safeAreaLift === 'half'
                ? Math.round(insets.bottom * 0.5)
                : 0) + insetBottom,
        },
        style,
      ]}
    >
      <View style={styles.dockShadow}>
        <View ref={targetRef} collapsable={false} style={styles.dock}>
          <BlurView
            intensity={floatingControl.material.intensity}
            tint={floatingControl.material.tint}
            style={StyleSheet.absoluteFillObject}
          />
          <View pointerEvents="none" style={styles.dockTint} />
          <ActionDockSplitContent
            recommendedAction={recommendedAction}
            menuActions={menuActions}
            onActionPress={onActionPress}
            disabledActionIds={disabledActionIds}
            menuAccessibilityLabel={menuAccessibilityLabel}
            primaryTestID={primaryTestID}
            menuTriggerTestID={menuTriggerTestID}
            getMenuTestID={getMenuTestID}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  dockShadow: { ...floatingControl.shadow },
  dock: {
    minHeight: 58,
    borderRadius: 99,
    overflow: 'hidden',
    borderWidth: floatingControl.material.borderWidth,
    borderColor: floatingControl.material.borderColor,
    backgroundColor: floatingControl.material.backgroundColor,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dockTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: floatingControl.material.overlayColor,
  },
});
