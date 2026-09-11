import { Pressable } from '@/src/ui/HapticPressable';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { RichTextBlock } from './RichTextBlock';
import { htmlToPlainText, normalizeToHtml } from './richText';
import { resolveInputAppearance } from './inputAppearance';
import type { LongTextFieldProps } from './LongTextField';

type Props = Pick<LongTextFieldProps,
  'label' | 'value' | 'testID' | 'placeholder' | 'disabled' | 'hideLabel' |
  'surfaceVariant' | 'onSurface'> & { onPress: () => void };

/** Internal read surface. LongTextField owns rich editing, navigation and persistence. */
export function LongTextFieldPreview({
  label, value, testID, placeholder = 'Tap to add details', disabled,
  hideLabel = false, surfaceVariant = 'card',
  onSurface = 'canvas', onPress: openEditor,
}: Props) {
  const previewAppearance = resolveInputAppearance({
    onSurface,
    variant: surfaceVariant === 'flat' ? 'plain' : 'filled',
  });
  const previewStyle = previewAppearance.frameStyle;
  const previewTextStyle = previewAppearance.textStyle;

  const normalizedReadHtml = normalizeToHtml(value);
  const readSurfaceHasLinks = /<a\b[^>]*\bhref\s*=\s*['"][^'"]+['"][^>]*>/i.test(normalizedReadHtml);

  return <>
      {!hideLabel ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, styles.unifiedLabel, disabled && styles.labelDisabled]}>{label}</Text>
        </View>
      ) : null}

      {readSurfaceHasLinks ? (
        <View
          style={[
            previewStyle,
            disabled && styles.readSurfaceDisabled,
          ]}
        >
          {htmlToPlainText(normalizedReadHtml).length ? (
            <>
              <RichTextBlock value={value} horizontalPaddingPx={surfaceVariant === 'flat' ? 0 : spacing.md} />
              {!disabled ? (
                <View style={styles.readSurfaceFooterRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${label}`}
                    onPress={openEditor}
                    hitSlop={8}
                    style={({ pressed }) => [styles.readSurfaceEditButton, pressed ? { opacity: 0.85 } : null]}
                  >
                    <Icon name="edit" size={14} color={colors.accent} /> {/* @kwilt-brand-moment: retained rich-notes Edit action from LongTextField; not decorative input fill. */}
                    <Text style={styles.readSurfaceEditText}>Edit</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            // Even if we *would* have links, empty state should stay tappable.
            <Pressable
              testID={testID}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${label}`}
              disabled={disabled}
              accessibilityState={{ disabled: Boolean(disabled) }}
              onPress={openEditor}
              style={({ pressed }) => [pressed && !disabled ? styles.readSurfacePressed : null]}
            >
              <Text style={[styles.placeholderText, previewTextStyle]}>{placeholder}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
          disabled={disabled}
          accessibilityState={{ disabled: Boolean(disabled) }}
          onPress={openEditor}
          style={({ pressed }) => [
            previewStyle,
            disabled && styles.readSurfaceDisabled,
            pressed && !disabled ? styles.readSurfacePressed : null,
          ]}
        >
          {htmlToPlainText(normalizeToHtml(value)).length ? (
            <RichTextBlock value={value} horizontalPaddingPx={surfaceVariant === 'flat' ? 0 : spacing.md} />
          ) : (
            <Text style={[styles.placeholderText, previewTextStyle]}>{placeholder}</Text>
          )}
        </Pressable>
      )}

  </>;
}

const styles = StyleSheet.create({
  labelRow: {
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  unifiedLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  labelDisabled: {
    color: colors.muted,
  },
  readSurfaceDisabled: {
    opacity: 0.6,
  },
  readSurfacePressed: {
    opacity: 0.92,
  },
  placeholderText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  readSurfaceFooterRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  readSurfaceEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  readSurfaceEditText: {
    ...typography.bodySm,
    color: colors.accent, // @kwilt-brand-moment: retained rich-notes Edit action from LongTextField; not decorative input fill.
  },
});
