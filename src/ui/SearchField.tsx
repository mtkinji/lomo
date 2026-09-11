import {forwardRef, useImperativeHandle, useRef, type ComponentProps} from 'react';
import type {TextInput} from 'react-native';
import {Input} from './Input';

export type SearchFieldProps = Omit<ComponentProps<typeof Input>,
  'value' | 'onChangeText' | 'multiline' | 'leadingIcon' | 'trailingIcon' | 'onPressTrailingIcon' | 'variant' | 'clearButtonMode'> & {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  onClear?: () => void;
  clearAccessibilityLabel?: string;
};

/** Canonical search composition; query interpretation and persistence belong to the caller. */
export const SearchField = forwardRef<TextInput, SearchFieldProps>(function SearchField({
  value, onChangeText, onClear, clearAccessibilityLabel = 'Clear search', editable = true, ...props
}, forwardedRef) {
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current!, []);
  const canClear = Boolean(value) && editable && !props.readOnly;
  return <Input
    autoCorrect={false}
    autoCapitalize="none"
    returnKeyType="search"
    {...props}
    ref={inputRef}
    editable={editable}
    value={value}
    onChangeText={onChangeText}
    variant="filled"
    elevation="flat"
    multiline={false}
    clearButtonMode="never"
    leadingIcon="search"
    trailingIcon={canClear ? 'close' : undefined}
    trailingIconAccessibilityLabel={clearAccessibilityLabel}
    onPressTrailingIcon={canClear ? () => {
      onChangeText('');
      onClear?.();
      inputRef.current?.focus();
    } : undefined}
  />;
});
