import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../ui/DropdownMenu';
import { Icon, type IconName } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { Text } from '../../ui/primitives';
import { menuItemTextProps } from '../../ui/menuStyles';
import type { GoalInventorySortMode } from './goalsInventorySort';

const GOAL_SORT_OPTIONS: Array<{ value: GoalInventorySortMode; label: string; icon: IconName }> = [
  { value: 'default', label: 'Default order', icon: 'sort' },
  { value: 'priorityAsc', label: 'Priority', icon: 'sortNumericAsc' },
  { value: 'updatedDesc', label: 'Recently updated', icon: 'sortCalendarDesc' },
  { value: 'titleAsc', label: 'Title A-Z', icon: 'sortAlphaAsc' },
  { value: 'titleDesc', label: 'Title Z-A', icon: 'sortAlphaDesc' },
  { value: 'nextTodoAsc', label: 'Next to-do', icon: 'sortCalendarAsc' },
  { value: 'activityCountDesc', label: 'Most to-dos', icon: 'sortNumericDesc' },
];

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  isSearching: boolean;
  onClear: () => void;
  sortMode: GoalInventorySortMode;
  onSortModeChange: (mode: GoalInventorySortMode) => void;
};

export function GoalsInventorySearchBar({
  value,
  onChangeText,
  isSearching,
  onClear,
  sortMode,
  onSortModeChange,
}: Props) {
  const selectedSortOption =
    GOAL_SORT_OPTIONS.find((option) => option.value === sortMode) ?? GOAL_SORT_OPTIONS[0];

  return (
    <View style={styles.row}>
      <View style={styles.inputContainer}>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder="Search goals"
          accessibilityLabel="Search goals"
          leadingIcon="search"
          trailingIcon={isSearching ? 'close' : undefined}
          onPressTrailingIcon={isSearching ? onClear : undefined}
          variant="filled"
          elevation="flat"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sort goals: ${selectedSortOption.label}`}
            style={({ pressed }) => [styles.sortButton, pressed && styles.pressed]}
          >
            <Icon name="sort" size={18} color={colors.textPrimary} />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={6} style={{ minWidth: 220 }}>
          {GOAL_SORT_OPTIONS.map((option) => {
            const selected = option.value === sortMode;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                accessibilityLabel={`Sort goals by ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => onSortModeChange(option.value)}
                style={({ pressed }) => [
                  styles.menuItem,
                  selected && styles.menuItemSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name={option.icon} size={16} color={selected ? colors.accent : colors.textSecondary} />
                <Text
                  style={[styles.menuItemText, selected && styles.menuItemTextSelected]}
                  {...menuItemTextProps}
                >
                  {option.label}
                </Text>
                {selected ? <Icon name="check" size={16} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
    minWidth: 0,
  },
  sortButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.gray100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    columnGap: spacing.sm,
  },
  menuItemSelected: {
    backgroundColor: colors.secondary,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  menuItemTextSelected: {
    color: colors.accent,
    fontFamily: typography.titleSm.fontFamily,
  },
});
