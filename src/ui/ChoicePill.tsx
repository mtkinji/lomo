import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';
import { Pressable } from './HapticPressable';
import { Icon, type IconName } from './Icon';
import { Text } from './Typography';

type Props = {
  icon: IconName;
  label: string;
  /** Exact, case-sensitive phrase within the label; absent phrases remain plain. */
  emphasis?: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
};

/** Navigation choice, not a toggle/radio or primary submission button.
 * Candidate implementation, scoped to the adopted onboarding path invitation.
 */
export function ChoicePill({ icon, label, emphasis, hint, onPress, disabled = false }: Props) {
  const [focused, setFocused] = useState(false);
  const start = emphasis ? label.indexOf(emphasis) : -1;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityHint={hint} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.root, focused && styles.focused, pressed && styles.pressed, disabled && styles.disabled]}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name={icon} size={22} color={colors.textSecondary} />
    </View>
    <Text style={styles.label}>{start < 0 ? label : <>
      {label.slice(0, start)}<Text style={styles.emphasis}>{emphasis}</Text>{label.slice(start + emphasis!.length)}
    </>}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minHeight: 54, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.pill, borderWidth: 1, borderColor: 'transparent', backgroundColor: colors.shellAlt },
  label: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  emphasis: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  focused: { borderColor: colors.textSecondary },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
