import React from 'react';
import { Pressable } from 'react-native';
import { HStack, Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { DropdownMenuItem } from '../../ui/DropdownMenu';
import { menuItemTextProps } from '../../ui/menuStyles';
import { colors } from '../../theme/colors';
import { styles } from './activitiesScreenStyles';
import type { ActivityView } from '../../domain/types';

export type ViewMenuItemProps = {
  view: ActivityView;
  onApplyView: (viewId: string) => void;
  onOpenViewSettings: (view: ActivityView) => void;
};

export function ViewMenuItem({ view, onApplyView, onOpenViewSettings }: ViewMenuItemProps) {
  const iconPressedRef = React.useRef(false);

  return (
    <DropdownMenuItem
      onPress={() => {
        if (!iconPressedRef.current) {
          onApplyView(view.id);
        }
        iconPressedRef.current = false;
      }}
    >
      <HStack alignItems="center" justifyContent="space-between" space="sm" flex={1}>
        <Text style={styles.menuItemText} {...menuItemTextProps}>
          {view.name}
        </Text>
        <Pressable
          onPress={() => {
            iconPressedRef.current = true;
            onOpenViewSettings(view);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="more" size={16} color={colors.textSecondary} />
        </Pressable>
      </HStack>
    </DropdownMenuItem>
  );
}

