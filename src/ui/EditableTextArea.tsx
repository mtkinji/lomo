import { useState, useRef } from 'react';
import { StyleSheet, View, Pressable, TextInput, Text } from 'react-native';
import { colors, spacing, typography } from '../theme';

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
          numberOfLines={maxCollapsedLines}
        />
        {enableAi && onRequestAiHelp && aiContext && isEditing ? (
          <Pressable onPress={handleRequestAi} style={styles.inlineAiButton}>
            <Text style={styles.inlineAiText}>Refine with AI</Text>
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
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  labelDisabled: {
    color: colors.muted,
  },
  textareaWrapper: {
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: spacing['2xl'] * 2,
  },
  textareaWrapperError: {
    borderColor: colors.destructive,
  },
  textareaWrapperFocused: {
    borderColor: colors.accent,
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


