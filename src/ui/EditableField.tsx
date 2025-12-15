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
import { cardElevation, colors, spacing, typography } from '../theme';

type EditableFieldVariant = 'title' | 'body' | 'meta';

type EditableFieldElevation = 'flat' | 'elevated';

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
  /**
   * Shadow treatment for the field wrapper. Mirrors the core `Input`
   * primitive so these inline editors visually align with other text fields.
   *
   * - `elevated` (default): subtle soft shadow used in the latest form spec.
   * - `flat`: no shadow; field appears flush with the canvas.
   */
  elevation?: EditableFieldElevation;
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
  elevation = 'elevated',
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
          elevation === 'elevated' ? cardElevation.soft : cardElevation.none,
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
          // Only request autofocus when the field is actively entering edit mode.
          // This prevents accidental mount-time focus/keyboard pop that can fight
          // onboarding coachmarks and other overlays.
          autoFocus={Boolean(autoFocusOnEdit && isEditing)}
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
    // Match root inputs: solid white with a subtle neutral border.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  inputWrapperError: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
  },
  inputWrapperFocused: {
    // Use the same neutral border color on focus; rely on caret and context
    // rather than a stronger ring to signal edit state.
    borderColor: colors.border,
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


