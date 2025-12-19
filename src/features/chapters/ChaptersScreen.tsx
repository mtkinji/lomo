import { StyleSheet } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, spacing, typography } from '../../theme';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { VStack, Heading, Text, EmptyState } from '../../ui/primitives';

export function ChaptersScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';

  return (
    <AppShell>
      <PageHeader
        title="Chapters"
        iconName="chapters"
        iconTone="chapter"
        menuOpen={menuOpen}
        onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <VStack space="lg">
        <EmptyState
          title="No chapters yet"
          instructions="Log a few activities first—then kwilt will help you generate a Chapter."
          primaryAction={{
            label: 'Go to Activities',
            variant: 'accent',
            onPress: () => navigation.navigate('Activities', { screen: 'ActivitiesList' }),
            accessibilityLabel: 'Go to the Activities list',
          }}
          style={styles.emptyState}
        />
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


