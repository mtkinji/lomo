import { StyleSheet } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { VStack, Heading, Text } from '../../ui/primitives';

export function ChaptersScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';

  return (
    <AppShell>
      <PageHeader
        title="Chapters"
        iconName="chapters"
        menuOpen={menuOpen}
        onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <VStack space="lg">
        <VStack space="sm" style={styles.emptyState}>
          <Heading style={styles.emptyTitle}>No chapters yet</Heading>
          <Text style={styles.emptyBody}>
            Chapters are narrative summaries of a chosen period in your life. Once you&apos;ve
            logged some Activities, we&apos;ll use AI to help you generate your first Chapter.
          </Text>
        </VStack>
      </VStack>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    marginTop: spacing['2xl'],
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});


