import React from 'react';
import { StyleSheet } from 'react-native';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../ui/DropdownMenu';
import { HStack, Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { menuItemTextProps } from '../../ui/menuStyles';
import { colors } from '../../theme/colors';
import type { ActivityTagGroup } from './tagGroups';

export function TagGroupMenuItems({
  tagGroups,
  activeTagGroupLabel,
  onApplyTagGroup,
  onClearTagGroup,
  onViewAllTags,
}: {
  tagGroups: ActivityTagGroup[];
  activeTagGroupLabel: string | null;
  onApplyTagGroup: (tag: string) => void;
  onClearTagGroup: () => void;
  onViewAllTags: () => void;
}) {
  if (tagGroups.length === 0) return null;

  const visibleGroups = tagGroups.slice(0, 5);
  const hasMore = tagGroups.length > visibleGroups.length;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Tags</DropdownMenuLabel>
      {activeTagGroupLabel ? (
        <DropdownMenuItem onPress={onClearTagGroup}>
          <HStack alignItems="center" space="xs">
            <Icon name="close" size={14} color={colors.textSecondary} />
            <Text style={styles.menuItemText} {...menuItemTextProps}>
              Clear tag
            </Text>
          </HStack>
        </DropdownMenuItem>
      ) : null}
      {visibleGroups.map((group) => {
        const selected = activeTagGroupLabel === group.tag;
        return (
          <DropdownMenuItem key={`tag-${group.key}`} onPress={() => onApplyTagGroup(group.tag)}>
            <HStack alignItems="center" justifyContent="space-between" space="sm" flex={1}>
              <HStack alignItems="center" space="xs" style={styles.tagLabel}>
                <Icon
                  name={selected ? 'check' : 'tag'}
                  size={14}
                  color={selected ? colors.accent : colors.textSecondary}
                />
                <Text style={styles.menuItemText} {...menuItemTextProps}>
                  {group.tag}
                </Text>
              </HStack>
              <Text style={styles.countText}>{group.activeCount}</Text>
            </HStack>
          </DropdownMenuItem>
        );
      })}
      {hasMore ? (
        <DropdownMenuItem onPress={onViewAllTags}>
          <HStack alignItems="center" space="xs">
            <Icon name="chevronRight" size={14} color={colors.textSecondary} />
            <Text style={styles.menuItemText} {...menuItemTextProps}>
              View all tags
            </Text>
          </HStack>
        </DropdownMenuItem>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  tagLabel: {
    flex: 1,
  },
  menuItemText: {
    color: colors.textPrimary,
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
