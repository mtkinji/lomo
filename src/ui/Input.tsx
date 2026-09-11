import { Pressable } from '@/src/ui/HapticPressable';
import { forwardRef, memo, useRef, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, TextInput, NativeSyntheticEvent, TextInputContentSizeChangeEventData, TextInputProps, Platform, findNodeHandle } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';
import { useKeyboardAwareScroll } from './KeyboardAwareScrollView';
import { InputFrame } from './InputFrame';
import { getInputTextViewport, resolveInputAppearance, type InputVariant, type InputParentSurface, type InputSurfaceRole } from './inputAppearance';

type InputSize = 'md' | 'sm';
type InputElevation = 'flat';

const MULTILINE_MIN_HEIGHT = 112;
const MULTILINE_MAX_HEIGHT = 220;

function getSingleLinePlatformMetrics(fontSize: number, explicitLineHeight?: number): TextStyle {
  if (Platform.OS === 'android') {
    // Android: remove extra font padding and request vertical centering.
    return {
      includeFontPadding: false,
      textAlignVertical: 'center',
      ...(explicitLineHeight != null ? { lineHeight: explicitLineHeight } : null),
    } as TextStyle;
  }

  // iOS: line-height strongly affects perceived vertical centering.
  // Keep it close to font size, then nudge baseline up a hair.
  // Important: many of our typography tokens use generous lineHeights (e.g. 24 for 17pt body),
  // which look great for multi-line text, but can make single-line TextInput baselines feel
  // off-center in fixed-height fields. Clamp lineHeight for single-line inputs.
  const targetLineHeight = fontSize + 2;
  const lineHeight =
    typeof explicitLineHeight === 'number'
      ? Math.min(explicitLineHeight, targetLineHeight)
      : targetLineHeight;
  return {
    lineHeight,
    marginTop: 0,
  } as TextStyle;
}

type Props = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  onPressTrailingIcon?: () => void;
  trailingIconAccessibilityLabel?: string;
  trailingElement?: ReactNode;
  /** Layout of the whole field (label, frame, help). Use for fields sharing a row. */
  wrapperStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  size?: InputSize;
  variant?: InputVariant;
  /** Parent material determines the contrasting neutral fill. */
  onSurface?: InputParentSurface;
  surfaceRole?: InputSurfaceRole;
  footerElement?: ReactNode;
  /**
   * Override the min/max height used when `multiline` is enabled.
   * Useful for compact note fields that shouldn't default to the larger textarea
   * spec.
   */
  multilineMinHeight?: number;
  multilineMaxHeight?: number;
  /** Inputs use flat material; elevated input chrome is unsupported. */
  elevation?: InputElevation;
  /** Keep the label neutral instead of applying the accent color on focus. */
  accentLabelOnFocus?: boolean;
};

const InputBase = forwardRef<TextInput, Props>(
  (
    {
      label,
      helperText,
      errorText,
      leadingIcon,
      trailingIcon,
      onPressTrailingIcon,
      trailingIconAccessibilityLabel,
      trailingElement,
      wrapperStyle,
      containerStyle,
      inputStyle,
      size = 'md',
      variant: requestedVariant,
      editable = true,
      elevation: requestedElevation,
      accentLabelOnFocus: requestedAccentLabel,
      onSurface = 'canvas',
      surfaceRole = 'field',
      footerElement,
      multilineMinHeight,
      multilineMaxHeight,
      onFocus,
      onBlur,
      multiline = false,
      onContentSizeChange,
      placeholderTextColor,
      accessibilityLabel,
      accessibilityHint,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const wrapperRef = useRef<View>(null);
    const [multilineHeight, setMultilineHeight] = useState<number | undefined>(undefined);
    const [footerHeight, setFooterHeight] = useState(0);
    const appearance = resolveInputAppearance({ onSurface, surfaceRole, size, variant: requestedVariant, elevation: requestedElevation, accentLabelOnFocus: requestedAccentLabel});
    const {variant, accentLabelOnFocus} = appearance;
    const hasError = Boolean(errorText);
    const keyboardAware = useKeyboardAwareScroll();
    const textViewport = getInputTextViewport({viewportHeight: keyboardAware?.viewportHeight, frameInset: appearance.frameInset, footerHeight: footerElement == null ? 0 : footerHeight});
    const maxHeight = Math.min(multilineMaxHeight ?? MULTILINE_MAX_HEIGHT, textViewport);
    const minHeight = Math.min(multilineMinHeight ?? MULTILINE_MIN_HEIGHT, maxHeight);
    const iconColor = hasError ? colors.destructive : colors.textSecondary;
    const flattenedInputStyle = StyleSheet.flatten(inputStyle) as TextStyle | undefined;
    const metricsFontSize =
      typeof flattenedInputStyle?.fontSize === 'number' ? flattenedInputStyle.fontSize : appearance.textStyle.fontSize!;
    const metricsLineHeight = typeof flattenedInputStyle?.lineHeight === 'number' ? flattenedInputStyle.lineHeight : undefined;

    return (
      <View ref={wrapperRef} collapsable={false} style={[styles.wrapper, wrapperStyle]}>
        {label ? (
          <Text style={[styles.label, focused && accentLabelOnFocus && styles.labelFocused]}>
            {label}
          </Text>
        ) : null}
        <InputFrame
          focused={focused && variant !== 'plain' && variant !== 'inline'}
          error={hasError}
          footer={footerElement}
          onFooterHeight={setFooterHeight}
          style={[
            styles.inputContainer,
            containerStyle,
            appearance.frameStyle,
            {opacity: !editable && !rest.readOnly ? 0.6 : 1},
          ]}
        >
          {leadingIcon ? (
            <View style={styles.iconWrapper}>
              <Icon name={leadingIcon} size={16} color={iconColor} />
            </View>
          ) : null}
          <TextInput
            {...rest}
            ref={ref}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint ?? errorText ?? helperText}
            editable={editable}
            multiline={multiline}
            placeholderTextColor={placeholderTextColor ?? colors.muted}
            onContentSizeChange={(
              event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
            ) => {
              if (multiline) {
                // Keep the content's height so it can expand again when the
                // keyboard shrinks without needing another native content event.
                setMultilineHeight(event.nativeEvent.contentSize.height);
                if (focused && keyboardAware?.keyboardHeight) {
                  requestAnimationFrame(() => keyboardAware.scrollToFocusedInput());
                }
              }
              onContentSizeChange?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              // The native text line is smaller than the visible field and its
              // tools. Register the field anatomy with the one layout owner.
              const fieldHandle = wrapperRef.current ? findNodeHandle(wrapperRef.current) : null;
              if (fieldHandle) keyboardAware?.registerFocusedInputFrame?.(fieldHandle);
              onFocus?.(event);
              // If the keyboard is already open (focus moved between fields),
              // proactively reveal the focused input.
              if (keyboardAware?.keyboardHeight) {
                requestAnimationFrame(() => keyboardAware.scrollToFocusedInput());
              }
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={[
              styles.input,
              // InputFrame owns browser focus material; avoid a second native-web outline.
              Platform.OS === 'web' && { outlineStyle: 'none' as never },
              multiline && styles.multilineInput,
              size === 'sm' && styles.inputSm,
              appearance.textStyle,
              // For inline variant, skip explicit height so TextInput auto-expands in real-time.
              // Other variants use managed height for controlled textarea behavior.
              multiline && multilineHeight != null && variant !== 'inline'
                ? { height: Math.max(minHeight, Math.min(multilineHeight, maxHeight)) }
                : null,
              multiline && multilineMinHeight != null ? { minHeight: multilineMinHeight } : null,
              inputStyle,
              multiline && keyboardAware?.viewportHeight != null ? { minHeight, maxHeight } : null,
              // Apply single-line platform metrics AFTER `inputStyle` so callers can specify
              // fontSize/lineHeight, but we still clamp lineHeight for proper vertical centering.
              !multiline ? getSingleLinePlatformMetrics(metricsFontSize, metricsLineHeight) : null,
              // Keep the subtle list-row baseline nudge for inline variant.
              variant === 'inline' ? styles.inlineInputNudge : null,
            ]}
          />
          {trailingIcon ? (
            <Pressable
              hitSlop={8}
              accessibilityRole={onPressTrailingIcon ? 'button' : undefined}
              accessibilityLabel={onPressTrailingIcon ? trailingIconAccessibilityLabel : undefined}
              accessible={Boolean(onPressTrailingIcon)}
              onPress={onPressTrailingIcon}
              disabled={!onPressTrailingIcon}
              style={[styles.iconWrapper, onPressTrailingIcon ? styles.interactiveIcon : null]}
            >
              <Icon name={trailingIcon} size={16} color={iconColor} />
            </Pressable>
          ) : trailingElement ? (
            <View style={styles.trailingElement}>{trailingElement}</View>
          ) : null}
        </InputFrame>
        {errorText ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>
            {errorText}
          </Text>
        ) : helperText ? (
          <Text style={styles.helperText}>{helperText}</Text>
        ) : null}
      </View>
    );
  },
);

InputBase.displayName = 'Input';

export const Input = memo(InputBase);

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelFocused: {
    color: colors.accent,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    lineHeight: typography.bodySm.lineHeight,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  inlineInputNudge: {
    // Visual centering: iOS text baselines tend to sit slightly low next to circular
    // checkboxes. Nudge upward a hair for list-row usage (single + multi-line).
    ...(Platform.OS === 'ios' ? { marginTop: -1 } : null),
  },
  inputSm: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 112,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactiveIcon: {
    minWidth: 28,
    minHeight: 28,
  },
  trailingElement: {
    marginLeft: spacing.xs,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.destructive,
    marginTop: spacing.xs,
  },
});
