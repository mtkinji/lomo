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

type InputVariant = 'surface' | 'outline' | 'ghost' | 'inline';
type InputSize = 'md' | 'sm';
type InputElevation = 'flat' | 'elevated';

const MULTILINE_MIN_HEIGHT = 112;
const MULTILINE_MAX_HEIGHT = 220;

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
    // Keep border color consistent between default and focused states;
    // only errors get a different color.
    const statusColor = hasError ? colors.destructive : colors.border;
    const iconColor = hasError ? colors.destructive : colors.textSecondary;

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
              borderColor: statusColor,
              opacity: editable ? 1 : 0.6,
            },
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
              !multiline ? styles.singleLinePlatformMetrics : null,
              multiline && styles.multilineInput,
              size === 'sm' && styles.inputSm,
              variant === 'inline' && !multiline ? styles.inlineSingleLineInput : null,
              multiline && multilineHeight != null
                ? { height: multilineHeight }
                : null,
              multiline && multilineMinHeight != null ? { minHeight: multilineMinHeight } : null,
              inputStyle,
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
  singleLinePlatformMetrics: {
    // Android: remove extra font padding and request vertical centering.
    ...(Platform.OS === 'android'
      ? ({
          includeFontPadding: false,
          textAlignVertical: 'center',
        } as TextStyle)
      : ({
          // iOS: line-height strongly affects perceived vertical centering.
          // Keep it closer to font size, then nudge baseline up a hair.
          lineHeight: typography.bodySm.fontSize + 2,
          marginTop: -1,
        } as TextStyle)),
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
