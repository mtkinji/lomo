import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DrawerActions, useNavigation, useRoute } from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { PlanPager } from './PlanPager';
import { Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/DropdownMenu';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { FloatingActionButton } from '../../ui/FloatingActionButton';
import { PlanDateStrip } from './PlanDateStrip';
export function PlanScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>() as unknown as { params?: RootDrawerParamList['Plan'] };
  const drawerOpen = useDrawerStatus() === 'open';
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [recsSheetSnapIndex, setRecsSheetSnapIndex] = useState(0);
  const [recsCount, setRecsCount] = useState(0);

  const shiftDays = (deltaDays: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + deltaDays);
    setSelectedDate(next);
  };

  // If we were deep-linked here (e.g. kickoff guide CTA), open the recommendations sheet.
  React.useEffect(() => {
    if (route?.params?.openRecommendations) {
      setRecsSheetSnapIndex(1);
      // Clear the param so back/forward nav doesn't re-trigger.
      (navigation as any).setParams?.({ openRecommendations: undefined });
    }
  }, [navigation, route?.params?.openRecommendations]);

  return (
    <AppShell>
      <View style={styles.container}>
        <PageHeader
          title="Plan"
          menuOpen={drawerOpen}
          onPressMenu={() => {
            navigation.dispatch(DrawerActions.openDrawer());
          }}
          rightElement={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  accessibilityLabel="Plan settings"
                  style={styles.headerMoreButton}
                  onPress={() => {
                    // handled by DropdownMenuTrigger
                  }}
                >
                  <Icon name="more" size={20} color={colors.textPrimary} />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem
                  onPress={() => {
                    (navigation as any).navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
                  }}
                >
                  <Text style={styles.menuItemText}>Manage calendars</Text>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onPress={() => {
                    (navigation as any).navigate('Settings', { screen: 'SettingsPlanAvailability' } as any);
                  }}
                >
                  <Text style={styles.menuItemText}>Set availability</Text>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        <View style={styles.dateStripRow}>
          <PlanDateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </View>

        <PlanPager
          insetMode="screen"
          targetDate={selectedDate}
          entryPoint="manual"
          recommendationsSheetSnapIndex={recsSheetSnapIndex}
          onRecommendationsSheetSnapIndexChange={setRecsSheetSnapIndex}
          onRecommendationsCountChange={setRecsCount}
          onNavigateDay={(delta) => shiftDays(delta)}
        />

        <FloatingActionButton
          accessibilityLabel="Open recommendations"
          onPress={() => setRecsSheetSnapIndex(1)}
          badgeCount={recsCount}
          icon={
            <Icon name="plan" size={22} color={colors.aiForeground} />
          }
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerControlsRow: {
    // AppShell already provides the canvas horizontal padding.
    // Adding extra padding here double-indents the controls.
    paddingHorizontal: 0,
  },
  headerChevronButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xs,
  },
  headerMoreButton: {
    backgroundColor: 'transparent',
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dateStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
  },
});

