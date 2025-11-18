import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@gluestack-ui/themed';
import { colors, spacing } from '../../theme';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Box style={styles.container}>{children}</Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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


