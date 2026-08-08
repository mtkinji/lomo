import { type ReactNode, useId } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Text } from './Typography';

export type FormFieldControlProps = {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState: AccessibilityState;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

type FormFieldProps = {
  label: ReactNode;
  accessibilityLabel?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  children: (props: FormFieldControlProps) => ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Consistent anatomy for custom fields. `Input` already owns this anatomy for
 * text entry; use FormField for segmented controls, pickers, and other controls.
 */
export function FormField({
  label,
  accessibilityLabel,
  description,
  error,
  required = false,
  disabled = false,
  children,
  style,
  testID,
}: FormFieldProps) {
  const descriptionId = useId();
  const labelText = accessibilityLabel ?? (typeof label === 'string' ? label : undefined);
  const hint = typeof error === 'string'
    ? error
    : typeof description === 'string'
      ? description
      : undefined;
  const controlProps: FormFieldControlProps = {
    accessibilityLabel: labelText,
    accessibilityHint: hint,
    accessibilityState: { disabled },
    'aria-invalid': Boolean(error),
    'aria-describedby': description || error ? descriptionId : undefined,
  };

  return (
    <View testID={testID} style={[styles.field, disabled && styles.disabled, style]}>
      <Text style={[styles.label, error ? styles.labelError : undefined]}>
        {label}
        {required ? <Text accessibilityLabel="required" style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.control}>
        {children(controlProps)}
      </View>
      {error ? (
        <Text
          nativeID={descriptionId}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.error}
        >
          {error}
        </Text>
      ) : description ? (
        <Text nativeID={descriptionId} style={styles.description}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelError: {
    color: colors.destructive,
  },
  required: {
    color: colors.destructive,
  },
  control: {
    width: '100%',
  },
  description: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.bodySm,
    color: colors.destructive,
    marginTop: spacing.xs,
  },
});
