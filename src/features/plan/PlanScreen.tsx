import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { PlanPager } from './PlanPager';
import { Text } from '../../ui/primitives';
import { colors, spacing, typography } from '../../theme';
import { menuItemTextProps, menuStyles } from '../../ui/menuStyles';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/DropdownMenu';
import type { MainTabsParamList } from '../../navigation/RootNavigator';
import { PlanDateStrip } from './PlanDateStrip';
import { useAppStore } from '../../store/useAppStore';
export function PlanScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>() as unknown as { params?: MainTabsParamList['PlanTab'] };
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [recsSheetSnapIndex, setRecsSheetSnapIndex] = useState(0);
  const [recsCount, setRecsCount] = useState(0);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const userProfile = useAppStore((state) => state.userProfile);
  const avatarName = authIdentity?.name?.trim() || userProfile?.fullName?.trim() || 'Kwilter';
  const avatarUrl = authIdentity?.avatarUrl || userProfile?.avatarUrl;

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
      <PageHeader
        title="Plan"
        onPressAvatar={() => (navigation as any).navigate('Settings', { screen: 'SettingsHome' })}
        avatarName={avatarName}
        avatarUrl={avatarUrl}
        rightElement={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                accessibilityLabel="Plan settings"
                variant="ghost"
                onPress={() => {
                  // handled by DropdownMenuTrigger
                }}
              >
                <Icon name="more" size={16} color={colors.textPrimary} />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                onPress={() => {
                  (navigation as any).navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
                }}
              >
                <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
                  Manage calendars
                </Text>
              </DropdownMenuItem>
              <DropdownMenuItem
                onPress={() => {
                  (navigation as any).navigate('Settings', { screen: 'SettingsPlanAvailability' } as any);
                }}
              >
                <Text style={menuStyles.menuItemText} {...menuItemTextProps}>
                  Set availability
                </Text>
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
    </AppShell>
  );
}

const styles = StyleSheet.create({
  dateStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
  },
});

