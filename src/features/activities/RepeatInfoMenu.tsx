import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing, typography } from '../../theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu';
import { Icon } from '../../ui/Icon';
import { Text, VStack } from '../../ui/primitives';

export function RepeatInfoMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How repeating to-dos work"
          hitSlop={8}
          style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
        >
          <Icon name="info" size={18} color={colors.textSecondary} />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" sideOffset={8} align="end" style={styles.content}>
        <Text style={styles.title}>How repeat works</Text>
        <VStack space="xs">
          <Text style={styles.body}>Kwilt keeps one copy active at a time.</Text>
          <Text style={styles.body}>Complete or skip it to create the next copy.</Text>
          <Text style={styles.body}>Missed copies do not pile up.</Text>
        </VStack>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerPressed: {
    backgroundColor: colors.fieldFillPressed,
  },
  content: {
    width: 260,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
