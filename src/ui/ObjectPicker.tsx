import * as React from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing, typography, colors } from '../theme';
import type { BottomDrawerSnapPoint } from './BottomDrawer';
import type { ComboboxOption } from './Combobox';
import { Combobox } from './Combobox';
import { Input } from './Input';

export type ObjectPickerOption = ComboboxOption;

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
}: Props) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return options.find((opt) => opt.value === value)?.label ?? '';
  }, [options, value]);

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
              variant="outline"
              elevation="flat"
              trailingIcon="chevronsUpDown"
              containerStyle={styles.valueContainer}
              inputStyle={styles.valueInput}
            />
          </View>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: '100%',
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  valueContainer: {
    // `Input` dims non-editable fields by default. For picker triggers, we want
    // full contrast so the field reads like an interactive control.
    opacity: 1,
  },
  valueInput: {
    ...typography.body,
    color: colors.textPrimary,
    paddingRight: spacing.xl,
  },
});


