import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, typography } from '../../theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import type {
  ActivityNextBestAction,
  ActivityNextBestActionId,
} from './nextBestAction';

type ActivityNextActionDockProps = {
  recommendedAction: ActivityNextBestAction;
  menuActions: ActivityNextBestAction[];
  onActionPress: (actionId: ActivityNextBestActionId, source: 'primary' | 'menu') => void;
  disabledActionIds?: Partial<Record<ActivityNextBestActionId, boolean>>;
  targetRef?: React.RefObject<View | null>;
  insetX?: number;
  insetBottom?: number;
  safeAreaLift?: 'none' | 'half' | 'full';
  style?: StyleProp<ViewStyle>;
  onLayout?: ViewProps['onLayout'];
};

type ActivityNextActionInlineContentProps = Pick<
  ActivityNextActionDockProps,
  'recommendedAction' | 'menuActions' | 'onActionPress' | 'disabledActionIds'
>;

export function ActivityNextActionInlineContent({
  recommendedAction,
  menuActions,
  onActionPress,
  disabledActionIds,
}: ActivityNextActionInlineContentProps) {
  const primaryDisabled = Boolean(disabledActionIds?.[recommendedAction.id]);
  const [primaryActionWidth, setPrimaryActionWidth] = React.useState(0);

  return (
    <View style={styles.inlineContent}>
      <Pressable
        testID="e2e.activityDetail.nextAction.primary"
        accessibilityRole="button"
        accessibilityLabel={recommendedAction.accessibilityLabel}
        accessibilityState={primaryDisabled ? { disabled: true } : undefined}
        disabled={primaryDisabled}
        hitSlop={10}
        onPress={() => onActionPress(recommendedAction.id, 'primary')}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (Number.isFinite(width)) setPrimaryActionWidth(width);
        }}
        style={({ pressed }) => [
          styles.primaryAction,
          primaryDisabled ? styles.disabled : null,
          pressed && !primaryDisabled ? styles.pressed : null,
        ]}
      >
        <Icon name={recommendedAction.icon} size={22} color={colors.textPrimary} />
        <Text style={styles.primaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>
          {recommendedAction.label}
        </Text>
      </Pressable>

      <View style={styles.divider} />

      <DropdownMenu>
        <DropdownMenuTrigger accessibilityLabel="Show other to-do actions">
          <View testID="e2e.activityDetail.nextAction.menuTrigger" pointerEvents="none" style={styles.menuTrigger}>
            <Icon name="chevronDown" size={22} color={colors.textPrimary} />
          </View>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          sideOffset={10}
          align="start"
          alignOffset={primaryActionWidth > 0 ? -(primaryActionWidth + StyleSheet.hairlineWidth) : 0}
        >
          {menuActions.map((action, index) => {
            const disabled = Boolean(disabledActionIds?.[action.id]);
            return (
              <React.Fragment key={action.id}>
                {index === 1 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  testID={`e2e.activityDetail.nextAction.menu.${action.id}`}
                  disabled={disabled}
                  onPress={() => onActionPress(action.id, 'menu')}
                >
                  <View style={styles.menuRow}>
                    <Icon
                      name={action.icon}
                      size={16}
                      color={disabled ? colors.muted : colors.textPrimary}
                    />
                    <Text
                      style={[styles.menuLabel, disabled ? styles.menuLabelDisabled : null]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {action.label}
                    </Text>
                  </View>
                </DropdownMenuItem>
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}

export function ActivityNextActionDock({
  recommendedAction,
  menuActions,
  onActionPress,
  disabledActionIds,
  targetRef,
  insetX = spacing.xl,
  insetBottom = 16,
  safeAreaLift = 'half',
  style,
  onLayout,
}: ActivityNextActionDockProps) {
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
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
          <View pointerEvents="none" style={styles.dockTint} />
          <ActivityNextActionInlineContent
            recommendedAction={recommendedAction}
            menuActions={menuActions}
            onActionPress={onActionPress}
            disabledActionIds={disabledActionIds}
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
  inlineContent: {
    minHeight: 56,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dockShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  dock: {
    minHeight: 58,
    borderRadius: 99,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.76)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dockTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  primaryAction: {
    minHeight: 56,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  primaryLabel: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  menuTrigger: {
    width: 54,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.48,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
    flex: 1,
  },
  menuLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    flexShrink: 1,
  },
  menuLabelDisabled: {
    color: colors.muted,
  },
});
