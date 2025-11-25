import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface AppShellProps {
  children: ReactNode;
  backgroundVariant?: 'default' | 'arcGradient';
}

export function AppShell({ children, backgroundVariant = 'default' }: AppShellProps) {
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
        style={[
          styles.container,
          {
            paddingTop: spacing.sm + insets.top,
            paddingBottom: insets.bottom,
            // For gradient variants, let the underlying shell/gradient show through.
            backgroundColor: backgroundVariant === 'arcGradient' ? 'transparent' : colors.shell,
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
});


