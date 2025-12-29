import { forwardRef, memo, useState, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Pressable,
  TextInput,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  TextInputProps,
  Platform,
} from 'react-native';
import { cardElevation, colors, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';
import { useKeyboardAwareScroll } from './KeyboardAwareScrollView';

type InputVariant = 'surface' | 'outline' | 'filled' | 'ghost' | 'inline';
type InputSize = 'md' | 'sm';
type InputElevation = 'flat' | 'elevated';

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
  trailingElement?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  size?: InputSize;
  variant?: InputVariant;
  /**
   * Override the min/max height used when `multiline` is enabled.
   * Useful for compact note fields that shouldn't default to the larger textarea
   * spec.
   */
  multilineMinHeight?: number;
  multilineMaxHeight?: number;
  /**
   * Shadow treatment for the input container.
   *
   * - `elevated`: subtle soft shadow + border, matches the refreshed
   *   text-field spec.
   * - `flat`: removes shadows entirely so the input sits flush on the canvas.
   *
   * Defaults to `elevated` so existing inputs adopt the new styling.
   */
  elevation?: InputElevation;
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
      trailingElement,
      containerStyle,
      inputStyle,
      size = 'md',
      variant = 'surface',
      editable = true,
      elevation = 'elevated',
      multilineMinHeight,
      multilineMaxHeight,
      onFocus,
      onBlur,
      multiline = false,
      onContentSizeChange,
      placeholderTextColor,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [multilineHeight, setMultilineHeight] = useState<number | undefined>(undefined);
    const hasError = Boolean(errorText);
    const keyboardAware = useKeyboardAwareScroll();
    // Border color: keep consistent between default and focused for bordered variants.
    // For borderless variants (e.g. `filled`), only show an outline on focus/error.
    const statusColor = hasError ? colors.destructive : colors.border;
    const iconColor = hasError ? colors.destructive : colors.textSecondary;
    const showFocusRing = focused && !hasError && variant === 'filled';
    const showErrorRing = hasError && variant === 'filled';
    const flattenedInputStyle = StyleSheet.flatten(inputStyle) as TextStyle | undefined;
    const metricsFontSize =
      typeof flattenedInputStyle?.fontSize === 'number' ? flattenedInputStyle.fontSize : typography.bodySm.fontSize;
    const metricsLineHeight = typeof flattenedInputStyle?.lineHeight === 'number' ? flattenedInputStyle.lineHeight : undefined;

    return (
      <View style={styles.wrapper}>
        {label ? <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text> : null}
        <View
          style={[
            styles.inputContainer,
            variantStyles[variant],
            // Inline variant should not inherit the default size paddings/minHeight;
            // it is meant to sit flush inside list rows.
            variant === 'inline' ? null : size === 'sm' ? styles.sizeSm : styles.sizeMd,
            {
              borderColor: showFocusRing ? colors.accent : showErrorRing ? colors.destructive : statusColor,
              opacity: editable ? 1 : 0.6,
            },
            showFocusRing || showErrorRing ? styles.filledRing : null,
            (variant === 'ghost' || variant === 'inline' || elevation === 'flat')
              ? (cardElevation.none as ViewStyle)
              : elevation === 'elevated'
              ? (cardElevation.soft as ViewStyle)
              : (cardElevation.none as ViewStyle),
            containerStyle,
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
            editable={editable}
            multiline={multiline}
            placeholderTextColor={placeholderTextColor ?? colors.muted}
            onContentSizeChange={(
              event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
            ) => {
              if (multiline) {
                const minH = multilineMinHeight ?? MULTILINE_MIN_HEIGHT;
                const maxH = multilineMaxHeight ?? MULTILINE_MAX_HEIGHT;
                const nextHeight = event.nativeEvent.contentSize.height;
                const clampedHeight = Math.max(
                  minH,
                  Math.min(nextHeight, maxH),
                );
                setMultilineHeight(clampedHeight);
              }
              onContentSizeChange?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
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
              multiline && styles.multilineInput,
              size === 'sm' && styles.inputSm,
              variant === 'inline' && !multiline ? styles.inlineSingleLineInput : null,
              multiline && multilineHeight != null
                ? { height: multilineHeight }
                : null,
              multiline && multilineMinHeight != null ? { minHeight: multilineMinHeight } : null,
              inputStyle,
              !multiline && variant !== 'inline'
                ? getSingleLinePlatformMetrics(metricsFontSize, metricsLineHeight)
                : null,
            ]}
          />
          {trailingIcon ? (
            <Pressable
              hitSlop={8}
              accessibilityRole={onPressTrailingIcon ? 'button' : undefined}
              onPress={onPressTrailingIcon}
              disabled={!onPressTrailingIcon}
              style={styles.iconWrapper}
            >
              <Icon name={trailingIcon} size={16} color={iconColor} />
            </Pressable>
          ) : trailingElement ? (
            <View style={styles.trailingElement}>{trailingElement}</View>
          ) : null}
        </View>
        {errorText ? (
          <Text style={styles.errorText}>{errorText}</Text>
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
  filledRing: {
    borderWidth: 1,
  },
  sizeMd: {
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  sizeSm: {
    minHeight: 36,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    lineHeight: typography.bodySm.lineHeight,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  inlineSingleLineInput: {
    // Visual centering: iOS text baselines tend to sit slightly low next to circular
    // checkboxes. Tighten lineHeight and nudge upward a hair for list-row usage.
    lineHeight: 18,
    marginTop: -1,
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

const variantStyles: Record<InputVariant, ViewStyle> = {
  surface: {
    // Default input background: solid white, no border
    backgroundColor: colors.canvas,
  },
  outline: {
    // Outline variant reuses the same base background; callers can add borders if needed.
    backgroundColor: colors.canvas,
  },
  filled: {
    // Borderless by default; uses a subtle filled surface so the field reads as interactive.
    backgroundColor: colors.fieldFill,
    borderWidth: 0,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  inline: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    minHeight: undefined,
  },
};
