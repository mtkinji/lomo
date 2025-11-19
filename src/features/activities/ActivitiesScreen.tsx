import { StyleSheet } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { VStack } from '@gluestack-ui/themed';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { colors, typography } from '../../theme';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';

export function ActivitiesScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';

  return (
    <AppShell>
      <PageHeader
        title="Activities"
        iconName="activities"
        subtitle="Capture, prioritize, and schedule the moves that bring your arcs to life."
        menuOpen={menuOpen}
        onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
      />
      <VStack space="sm">
        {/* Placeholder body copy while the workspace is under construction */}
      </VStack>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.titleLg,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});


