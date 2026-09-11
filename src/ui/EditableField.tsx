import { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  type TextInput,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { spacing, typography } from '../theme';
import { Input } from './Input';

type EditableFieldVariant = 'title' | 'body' | 'meta';

export interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit?: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  validate?: (next: string) => string | null;
  variant?: EditableFieldVariant;
  autoFocusOnEdit?: boolean;
  /**
   * Optional style override for the outer container. Use sparingly for local
   * alignment tweaks (e.g., reducing vertical padding next to a thumbnail).
   */
  style?: StyleProp<ViewStyle>;
}

export function EditableField({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  validate,
  variant = 'body',
  // Best-practice default: do NOT auto-focus on mount. Auto-focus should be opt-in
  // and only used in explicit "create/edit" flows where no other overlay (coachmark,
  // modal, etc.) competes for attention.
  autoFocusOnEdit = false,
  style,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const commit = (next: string) => {
    const validationError = validate ? validate(next) : null;
    if (validationError) {
      setError(validationError);
      return;
    }
    if (next !== value) {
      onChange(next);
      if (onSubmit) {
        onSubmit(next);
      }
    }
    setIsEditing(false);
    setError(null);
  };

  const handleSubmitEditing = (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    commit(e.nativeEvent.text);
  };

  return (
    <View style={[styles.container, style]}>
      <Input
        ref={inputRef}
        label={label}
        errorText={error ?? undefined}
        size={variant === 'meta' ? 'sm' : 'md'}
        inputStyle={variant === 'title' ? typography.titleSm : undefined}
        value={isEditing ? draft : value}
        onFocus={() => {
          if (disabled) {
            inputRef.current?.blur();
            return;
          }
          setDraft(value);
          setError(null);
          setIsEditing(true);
        }}
        onChangeText={setDraft}
        placeholder={placeholder || 'Tap to edit'}
        editable={!disabled}
        autoFocus={Boolean(autoFocusOnEdit && isEditing)}
        onSubmitEditing={handleSubmitEditing}
        onBlur={() => {
          commit(draft);
          setIsEditing(false);
        }}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {paddingVertical: spacing.md},
});
