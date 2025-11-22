import { forwardRef, memo, useState, ReactNode } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Pressable } from '@gluestack-ui/themed';
import { colors, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';

type InputVariant = 'surface' | 'outline' | 'ghost';
type InputSize = 'md' | 'sm';

type FocusEventParam = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEventParam = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

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
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const hasError = Boolean(errorText);

    const handleFocus = (event: FocusEventParam) => {
      setFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: BlurEventParam) => {
      setFocused(false);
      onBlur?.(event);
    };

    const statusColor = hasError ? '#B91C1C' : focused ? colors.accent : colors.border;
    const iconColor = hasError ? '#B91C1C' : colors.textSecondary;

    return (
      <View style={styles.wrapper}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
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
          <TextInput
            {...rest}
            ref={ref}
            editable={editable}
            multiline={multiline}
            style={[
              styles.input,
              multiline && styles.multilineInput,
              size === 'sm' && styles.inputSm,
              inputStyle,
            ]}
            placeholderTextColor={colors.muted}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sizeMd: {
    minHeight: 44,
    paddingVertical: 0,
  },
  sizeSm: {
    minHeight: 36,
    paddingVertical: 0,
    borderRadius: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  inputSm: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
  },
  multilineInput: {
    textAlignVertical: 'top',
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
    color: '#B91C1C',
    marginTop: spacing.xs,
  },
});

const variantStyles: Record<InputVariant, ViewStyle> = {
  surface: {
    backgroundColor: colors.shell,
  },
  outline: {
    backgroundColor: colors.canvas,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
};


