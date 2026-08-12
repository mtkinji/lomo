import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface AppShellProps {
  children: ReactNode;
  backgroundVariant?: 'default' | 'shellAlt' | 'arcGradient';
  /**
   * When true, removes the default canvas padding (top + horizontal) so screens can render
   * full-bleed content (e.g. hero images) while still living inside the app shell.
   * Those screens should provide their own internal padding where needed.
   */
  fullBleedCanvas?: boolean;
  /** Removes only the horizontal canvas inset while preserving safe-area top padding. */
  fullBleedHorizontal?: boolean;
}

export function AppShell({
  children,
  backgroundVariant = 'default',
  fullBleedCanvas = false,
  fullBleedHorizontal = false,
}: AppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.shell}>
      {backgroundVariant === 'arcGradient' ? (
        <LinearGradient
          colors={[colors.arcShellTop, colors.arcShellBottom]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View
        testID="app-shell-container"
        style={[
          styles.container,
          {
            paddingTop: fullBleedCanvas ? 0 : insets.top,
            // NOTE: Do not pad the canvas bottom here.
            // Bottom safe area should be handled by scrollable content (via contentContainerStyle)
            // or by explicit bottom UI (e.g., a composer) so content can scroll into the bottom space
            // rather than being clipped.
            paddingBottom: 0,
            paddingHorizontal: fullBleedCanvas || fullBleedHorizontal ? 0 : spacing.sm,
            // For gradient variants, let the underlying shell/gradient show through.
            backgroundColor: backgroundVariant === 'arcGradient'
              ? 'transparent'
              : backgroundVariant === 'shellAlt'
                ? colors.shellAlt
                : colors.shell,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    // Shell: match light canvas so the whole background feels continuous
    backgroundColor: colors.shell,
  },
  container: {
    flex: 1,
    // Canvas: Light surface floating on top of the Pine shell
    backgroundColor: colors.shell,
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
});
