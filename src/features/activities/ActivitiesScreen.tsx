import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { VStack } from '../../ui/primitives';

export function ActivitiesScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const drawerStatus = useDrawerStatus();
  const menuOpen = drawerStatus === 'open';

  return (
    <AppShell>
      <PageHeader
        title="Activities"
        iconName="activities"
        menuOpen={menuOpen}
        onPressMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
        rightElement={
          <IconButton
            accessibilityRole="button"
            accessibilityLabel="Add Activity"
            onPress={() => {
              // TODO: wire to Activity creation sheet when implemented.
            }}
          >
            <Icon name="plus" size={18} color="#FFFFFF" />
          </IconButton>
        }
      />
      <VStack space="sm">
        {/* Placeholder body copy while the workspace is under construction */}
      </VStack>
    </AppShell>
  );
}

