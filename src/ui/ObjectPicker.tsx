import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing, typography, colors } from '../theme';
import type { BottomDrawerSnapPoint } from './BottomDrawer';
import type { ComboboxOption, ComboboxRecommendedOption } from './Combobox';
import { Combobox } from './Combobox';
import { Input } from './Input';
import type { IconName } from './Icon';
import { Icon } from './Icon';

export type ObjectPickerOption = ComboboxOption;

type ObjectPickerSize = 'default' | 'compact';
type ObjectPickerFieldVariant = 'outline' | 'filled';

type Props = {
  /**
   * Options are usually workspace objects (e.g., Arcs, Goals).
   * Use empty string value to represent "no selection".
   */
  options: ObjectPickerOption[];
  value: string;
  onValueChange: (nextValue: string) => void;

  /**
   * Field copy.
   */
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  accessibilityLabel: string;

  /**
   * Behavior.
   */
  allowDeselect?: boolean;
  presentation?: 'popover' | 'drawer' | 'auto';
  drawerSnapPoints?: BottomDrawerSnapPoint[];
  disabled?: boolean;
  recommendedOption?: ComboboxRecommendedOption;

  /**
   * Visual styling.
   */
  size?: ObjectPickerSize;
  leadingIcon?: IconName;
  fieldVariant?: ObjectPickerFieldVariant;
};

/**
 * Canonical "object picker" field for linking entities (Arc, Goal, etc.).
 *
 * This wraps `Combobox` with a standard trigger UI so features don’t have to
 * re-implement the same Pressable + Input + chevron wiring.
 */
export function ObjectPicker({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  accessibilityLabel,
  allowDeselect = true,
  presentation = 'auto',
  drawerSnapPoints,
  disabled,
  recommendedOption,
  size = 'default',
  leadingIcon,
  fieldVariant = 'outline',
}: Props) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return options.find((opt) => opt.value === value)?.label ?? '';
  }, [options, value]);

  const showClear = Boolean(value) && allowDeselect && !disabled;

  const handleClear = useCallback(() => {
    if (disabled) return;
    // Clear selection without opening the picker.
    setOpen(false);
    onValueChange('');
  }, [disabled, onValueChange]);

  const inputStyle = size === 'compact' ? styles.valueInputCompact : styles.valueInput;
  const inputSize = size === 'compact' ? 'sm' : 'md';
  const fieldContainerStyle =
    size === 'compact' ? styles.fieldContainerCompact : styles.fieldContainer;

  return (
    <Combobox
      open={open}
      onOpenChange={setOpen}
      value={value}
      onValueChange={onValueChange}
      options={options}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      allowDeselect={allowDeselect}
      presentation={presentation}
      drawerSnapPoints={drawerSnapPoints}
      recommendedOption={recommendedOption}
      trigger={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          disabled={disabled}
        >
          <View pointerEvents="none">
            <Input
              value={selectedLabel}
              placeholder={placeholder}
              editable={false}
              variant={fieldVariant}
              elevation="flat"
              leadingIcon={leadingIcon}
              size={inputSize}
              containerStyle={[styles.valueContainer, fieldContainerStyle]}
              inputStyle={inputStyle}
            />
          </View>
          <View style={styles.accessoryRow} pointerEvents="box-none">
            {showClear ? (
              <Pressable
                hitSlop={10}
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel="Remove selection"
                style={styles.clearButton}
              >
                <Icon name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}
            <View pointerEvents="none" style={styles.chevronWrapper}>
              <Icon name="chevronsUpDown" size={16} color={colors.textSecondary} />
            </View>
          </View>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: '100%',
    position: 'relative',
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  valueContainer: {
    // `Input` dims non-editable fields by default. For picker triggers, we want
    // full contrast so the field reads like an interactive control.
    opacity: 1,
  },
  fieldContainer: {
    // Match the canonical single-line field sizing used across the app
    // (e.g. the collapsed "Add an activity" control).
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fieldContainerCompact: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  valueInput: {
    ...typography.body,
    color: colors.textPrimary,
    // Reserve space for (optional) clear button + chevron indicator.
    paddingRight: spacing['2xl'] + spacing.lg,
  },
  valueInputCompact: {
    ...typography.bodySm,
    color: colors.textPrimary,
    paddingRight: spacing['2xl'] + spacing.lg,
  },
  accessoryRow: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearButton: {
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  chevronWrapper: {
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


