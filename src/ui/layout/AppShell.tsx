import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.shell}>
      <Box
        style={[
          styles.container,
          {
            paddingTop: spacing.sm + insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {children}
      </Box>
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


