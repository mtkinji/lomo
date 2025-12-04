import { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
  StyleProp,
  ViewStyle,
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
  autoFocusOnEdit = true,
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
    <View style={[styles.container, style]}>
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
    // Indent to align with the text inside the input wrapper,
    // not the card edge, so the label feels like a micro-label
    // for the field value rather than a section header.
    paddingLeft: spacing.md,
  },
  label: {
    ...typography.label,
    // De-emphasize the label visually so the field value
    // is the primary focus.
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
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
    // Match root inputs: solid white, borderless, with a subtle contact shadow.
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  inputWrapperError: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
  },
  inputWrapperFocused: {
    // Slightly stronger shadow on edit without introducing a border.
    shadowOpacity: 0.16,
    shadowRadius: 4,
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


