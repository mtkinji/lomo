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
} from 'react-native';
import { Input as ReusableInput } from '@/components/ui/input';
import type { TextInputProps } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';

type InputVariant = 'surface' | 'outline' | 'ghost';
type InputSize = 'md' | 'sm';

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
      onFocus,
      onBlur,
      multiline = false,
      onContentSizeChange,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const [multilineHeight, setMultilineHeight] = useState<number | undefined>(undefined);
    const hasError = Boolean(errorText);
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
            size === 'sm' ? styles.sizeSm : styles.sizeMd,
            {
              borderColor: statusColor,
              opacity: editable ? 1 : 0.6,
            },
            containerStyle,
          ]}
        >
          {leadingIcon ? (
            <View style={styles.iconWrapper}>
              <Icon name={leadingIcon} size={16} color={iconColor} />
            </View>
          ) : null}
          <ReusableInput
            {...rest}
            ref={ref as any}
            editable={editable}
            multiline={multiline}
            onContentSizeChange={(
              event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
            ) => {
              if (multiline) {
                const nextHeight = event.nativeEvent.contentSize.height;
                const clampedHeight = Math.max(
                  MULTILINE_MIN_HEIGHT,
                  Math.min(nextHeight, MULTILINE_MAX_HEIGHT),
                );
                setMultilineHeight(clampedHeight);
              }
              onContentSizeChange?.(event);
            }}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            className=""
            style={[
              styles.input,
              multiline && styles.multilineInput,
              size === 'sm' && styles.inputSm,
              multiline && multilineHeight != null
                ? { height: multilineHeight }
                : null,
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
};


