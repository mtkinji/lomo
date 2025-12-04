import { useState, useRef } from 'react';
import { StyleSheet, View, Pressable, TextInput, Text } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Icon } from './Icon';

interface AiHelpContext {
  objectType: 'arc' | 'goal' | 'activity' | 'chapter';
  objectId: string;
  fieldId: string;
  currentText: string;
}

export interface EditableTextAreaProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onSubmit?: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Maximum number of visible lines when the field is in its resting state.
   * Pass `0` or a negative value to disable collapsing and allow the textarea
   * to grow naturally with its content.
   */
  maxCollapsedLines?: number;
  validate?: (next: string) => string | null;
  enableAi?: boolean;
  onRequestAiHelp?: (args: AiHelpContext) => void;
  aiContext?: Omit<AiHelpContext, 'currentText'>;
}

export function EditableTextArea({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  maxCollapsedLines = 3,
  validate,
  enableAi,
  onRequestAiHelp,
  aiContext,
}: EditableTextAreaProps) {
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

  const handleRequestAi = () => {
    if (!enableAi || !onRequestAiHelp || !aiContext) return;
    onRequestAiHelp({
      ...aiContext,
      currentText: draft,
    });
  };

  const labelStyle = [
    styles.label,
    disabled && styles.labelDisabled,
  ];

  const effectiveNumberOfLines =
    typeof maxCollapsedLines === 'number' && maxCollapsedLines > 0
      ? maxCollapsedLines
      : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={labelStyle}>{label}</Text>
      </View>
      <View
        style={[
          styles.textareaWrapper,
          isEditing && styles.textareaWrapperFocused,
          isEditing && styles.textareaWrapperExpanded,
          error && styles.textareaWrapperError,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.textarea,
            enableAi && isEditing && styles.textareaWithInlineButton,
          ]}
          value={isEditing ? draft : value}
          onChangeText={setDraft}
          placeholder={placeholder || 'Tap to add details'}
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          editable={!disabled}
          onFocus={() => {
            if (disabled) {
              inputRef.current?.blur();
              return;
            }
            setDraft(value);
            setError(null);
            setIsEditing(true);
          }}
          onBlur={() => {
            commit(draft);
            setIsEditing(false);
          }}
          // When `maxCollapsedLines` is 0 or negative, we omit `numberOfLines`
          // so React Native lets the textarea expand to fit the full content.
          numberOfLines={effectiveNumberOfLines}
        />
        {enableAi && onRequestAiHelp && aiContext && isEditing ? (
          <Pressable onPress={handleRequestAi} style={styles.inlineAiButton}>
            <View style={styles.inlineAiContent}>
              <Icon name="sparkles" size={14} color={colors.primaryForeground} />
              <Text style={styles.inlineAiText}>Refine with AI</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
  },
  labelRow: {
    marginBottom: spacing.xs,
    // Indent to align with the text inside the textarea wrapper,
    // keeping the label visually tied to the field content.
    paddingLeft: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  labelDisabled: {
    color: colors.muted,
  },
  textareaWrapper: {
    borderRadius: 12,
    // Match root inputs: solid white, borderless, with a subtle contact shadow.
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: spacing['2xl'] * 2,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  textareaWrapperError: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
  },
  textareaWrapperFocused: {
    // Slightly stronger shadow on edit without introducing a border.
    shadowOpacity: 0.16,
    shadowRadius: 4,
  },
  textareaWrapperExpanded: {
    // Extra height while editing so the inline AI button
    // can sit comfortably on its own line below the text,
    // with generous breathing room.
    minHeight: spacing['2xl'] * 4,
  },
  textarea: {
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
    minHeight: spacing['2xl'] * 1.5,
  },
  textareaWithInlineButton: {
    paddingRight: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  inlineAiButton: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  inlineAiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
  },
  inlineAiText: {
    ...typography.bodySm,
    color: colors.primaryForeground,
  },
  errorText: {
    marginTop: spacing.xs,
    ...typography.bodySm,
    color: colors.destructive,
  },
});


