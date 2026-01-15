import * as React from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle, Platform } from 'react-native';
import { colors, spacing, typography } from '../theme';

export type NarrativeEditableTitleRef = {
  /** Programmatically dismiss keyboard and commit changes */
  blur: () => void;
};

type Props = {
  value: string;
  placeholder?: string;
  accessibilityLabel: string;
  /**
   * Called with a trimmed value when the edit is committed.
   * Not called if the trimmed value is empty or unchanged.
   */
  onCommit: (nextTrimmed: string) => void;
  /**
   * When false, disables editing entirely (renders as plain text).
   */
  editable?: boolean;
  /**
   * Optional additional validation. Return an error string to block commit.
   */
  validate?: (nextTrimmed: string) => string | null;
  /**
   * Called when editing state changes (user taps to edit, or editing is dismissed).
   */
  onEditingChange?: (isEditing: boolean) => void;
  /**
   * Style overrides for the text and input.
   * Keep these very similar so view/edit feel like the same "surface".
   */
  textStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export const NarrativeEditableTitle = React.forwardRef<NarrativeEditableTitleRef, Props>(function NarrativeEditableTitle({
  value,
  placeholder,
  accessibilityLabel,
  onCommit,
  editable = true,
  validate,
  onEditingChange,
  textStyle,
  inputStyle,
  containerStyle,
}, ref) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<TextInput | null>(null);

  // Notify parent when editing state changes
  React.useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(value);
      setError(null);
    }
  }, [isEditing, value]);

  const commit = React.useCallback(() => {
    const nextTrimmed = draft.trim();
    if (!nextTrimmed) {
      setError('Title cannot be empty');
      return;
    }
    const customError = validate?.(nextTrimmed) ?? null;
    if (customError) {
      setError(customError);
      return;
    }
    if (nextTrimmed !== value.trim()) {
      onCommit(nextTrimmed);
    }
    setIsEditing(false);
    setError(null);
  }, [draft, onCommit, validate, value]);

  // Expose blur method to parent via ref
  React.useImperativeHandle(ref, () => ({
    blur: () => {
      Keyboard.dismiss();
    },
  }), []);

  if (!editable) {
    return (
      <View style={containerStyle} accessibilityLabel={accessibilityLabel}>
        <Text style={[styles.textBase, textStyle]}>{value}</Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {isEditing ? (
        <TextInput
          ref={inputRef}
          accessibilityLabel={accessibilityLabel}
          value={draft}
          onChangeText={(next) => {
            setDraft(next);
            if (error) setError(null);
          }}
          style={[styles.inputBase, textStyle, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoFocus
          multiline
          scrollEnabled={false}
          returnKeyType={Platform.OS === 'android' ? 'done' : 'default'}
          blurOnSubmit={Platform.OS === 'android'}
          onSubmitEditing={() => {
            commit();
          }}
          onBlur={() => {
            commit();
          }}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => {
            setDraft(value);
            setError(null);
            setIsEditing(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          <Text style={[styles.textBase, textStyle]}>{value || placeholder || ''}</Text>
        </Pressable>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  textBase: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  inputBase: {
    padding: 0,
    color: colors.textPrimary,
    // Keep input aligned with the "text" baseline as much as possible.
    ...(Platform.OS === 'android'
      ? ({
          includeFontPadding: false,
          textAlignVertical: 'top',
        } as any)
      : ({
          lineHeight: typography.titleSm.fontSize + 4,
        } as any)),
  },
  errorText: {
    marginTop: spacing.xs,
    ...typography.bodySm,
    color: colors.destructive,
  },
});


