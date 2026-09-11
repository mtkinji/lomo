import * as React from 'react';
import { Platform, TextInput, StyleSheet, type TextInputProps, type TextStyle } from 'react-native';
import { colors, typography } from '../theme';

export type TitleInputProps = Omit<TextInputProps, 'multiline' | 'scrollEnabled' | 'accessibilityLabel'> & {
  accessibilityLabel: string;
};

/**
 * Editorial heading entry. The surrounding scroll host owns vertical movement;
 * this native editor grows with its text and has no paragraph minimum or cap.
 * Callers own draft/commit policy and may supply the matching heading typography.
 */
export const TitleInput = React.forwardRef<TextInput, TitleInputProps>(function TitleInput(
  { style, accessibilityLabel, ...props }, ref,
) {
  return (
    <TextInput
      {...props}
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      placeholderTextColor={colors.muted}
      style={[styles.editor, Platform.OS === 'web' && webContentSizing, style]}
      multiline
      scrollEnabled={false}
    />
  );
});

// Browsers otherwise retain the textarea's default two-row viewport. Native
// multiline TextInput already grows when scrolling is disabled.
const webContentSizing: TextStyle & { fieldSizing: 'content' } = {
  fieldSizing: 'content',
};

const styles = StyleSheet.create({
  editor: {
    ...typography.titleSm,
    color: colors.textPrimary,
    padding: 0,
  },
});
