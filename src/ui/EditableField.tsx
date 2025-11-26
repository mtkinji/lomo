import { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from 'react-native';
import { colors, spacing, typography } from '../theme';

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
  autoFocusOnEdit = true,
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

  const labelStyle = [
    styles.label,
    disabled && styles.labelDisabled,
  ];

  const valueTextStyle = [
    styles.valueBase,
    variant === 'title' && styles.valueTitle,
    variant === 'meta' && styles.valueMeta,
    disabled && styles.valueDisabled,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={labelStyle}>{label}</Text>
      </View>
      <View
        style={[
          styles.inputWrapper,
          isEditing && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            variant === 'title' && styles.inputTitle,
            !value && !isEditing && styles.placeholderText,
          ]}
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
          placeholderTextColor={colors.muted}
          editable={!disabled}
          autoFocus={autoFocusOnEdit}
          onSubmitEditing={handleSubmitEditing}
          onBlur={() => {
            commit(draft);
            setIsEditing(false);
          }}
          returnKeyType="done"
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  labelRow: {
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  labelDisabled: {
    color: colors.muted,
  },
  valueBase: {
    ...typography.body,
    color: colors.textPrimary,
  },
  valueTitle: {
    ...typography.titleSm,
  },
  valueMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  valueDisabled: {
    color: colors.muted,
  },
  placeholderText: {
    color: colors.muted,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  inputWrapperError: {
    borderColor: colors.destructive,
  },
  inputWrapperFocused: {
    borderColor: colors.accent,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  inputTitle: {
    ...typography.titleSm,
  },
  errorText: {
    marginTop: spacing.xs,
    ...typography.bodySm,
    color: colors.destructive,
  },
});


