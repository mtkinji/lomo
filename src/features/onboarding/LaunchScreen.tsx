import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppShell } from '../../ui/layout/AppShell';
import { Logo } from '../../ui/Logo';
import { colors, spacing, typography } from '../../theme';
import { Text } from '../../ui/primitives';

/**
 * Simple in-app launch screen that appears after the native splash and
 * before the main navigation shell. Uses the kwilt Logo plus a vertical
 * lockup wordmark set in the Poppins brand font.
 *
 * This preserves the global AppShell (shell + canvas) structure while
 * avoiding any primary navigation affordances.
 */
export function LaunchScreen() {
  return (
    <AppShell>
      <View style={styles.container}>
        <View style={styles.brandLockup}>
          <Logo size={56} />
          <Text style={styles.wordmark}>kwilt</Text>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  wordmark: {
    ...typography.brand,
    color: colors.accent,
  },
});


