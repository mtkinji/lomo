import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '../theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu';
import { Icon, type IconName } from './Icon';

const MENU_TRIGGER_WIDTH_PX = 44;

export type ActionDockSplitAction<Id extends string = string> = {
  id: Id;
  icon: IconName;
  label: string;
  accessibilityLabel: string;
};

type Props<Id extends string> = {
  recommendedAction: ActionDockSplitAction<Id>;
  menuActions: ActionDockSplitAction<Id>[];
  onActionPress: (actionId: Id, source: 'primary' | 'menu') => void;
  disabledActionIds?: Partial<Record<Id, boolean>>;
  menuAccessibilityLabel: string;
  primaryTestID?: string;
  menuTriggerTestID?: string;
  getMenuTestID?: (actionId: Id) => string | undefined;
};

export function ActionDockSplitContent<Id extends string>({
  recommendedAction,
  menuActions,
  onActionPress,
  disabledActionIds,
  menuAccessibilityLabel,
  primaryTestID,
  menuTriggerTestID,
  getMenuTestID,
}: Props<Id>) {
  const primaryDisabled = Boolean(disabledActionIds?.[recommendedAction.id]);
  const [primaryActionWidth, setPrimaryActionWidth] = React.useState(0);

  return (
    <View style={styles.inlineContent}>
      <Pressable
        testID={primaryTestID}
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
        <DropdownMenuTrigger accessibilityLabel={menuAccessibilityLabel}>
          <View testID={menuTriggerTestID} pointerEvents="none" style={styles.menuTrigger}>
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
                  testID={getMenuTestID?.(action.id)}
                  disabled={disabled}
                  onPress={() => onActionPress(action.id, 'menu')}
                >
                  <View style={styles.menuRow}>
                    <Icon name={action.icon} size={16} color={disabled ? colors.muted : colors.textPrimary} />
                    <Text
                      style={[styles.menuLabel, disabled ? styles.menuLabelDisabled : null]}
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

const styles = StyleSheet.create({
  inlineContent: { minHeight: 56, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  primaryAction: { minHeight: 56, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.md },
  primaryLabel: { ...typography.body, fontSize: 16, lineHeight: 22, color: colors.textPrimary, fontFamily: fonts.medium, flexShrink: 1 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  menuTrigger: { width: MENU_TRIGGER_WIDTH_PX, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0, flex: 1 },
  menuLabel: { ...typography.body, color: colors.textPrimary, fontFamily: fonts.medium, flexShrink: 1 },
  menuLabelDisabled: { color: colors.muted },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.48 },
});
