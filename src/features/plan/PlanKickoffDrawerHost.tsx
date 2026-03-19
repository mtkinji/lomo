import React, { useEffect, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { BottomGuide } from '../../ui/BottomGuide';
import { VStack, Text, HStack } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { spacing, typography, colors } from '../../theme';

type PlanKickoffCadence = 'daily' | 'weekdays' | 'weekly';

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePlanKickoffCadence(raw: unknown): PlanKickoffCadence {
  if (raw === 'daily' || raw === 'weekdays' || raw === 'weekly') return raw;
  return 'daily';
}

function normalizePlanKickoffWeeklyDay(raw: unknown): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 6) {
    return raw as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  }
  return 1;
}

function shouldShowPlanKickoffToday(params: {
  now: Date;
  hasCompletedFirstTimeOnboarding: boolean;
  isFirstTimeFlowActive: boolean;
  lastKickoffShownDateKey: string | null;
  allowPlanKickoff: boolean;
  planKickoffCadence: unknown;
  planKickoffWeeklyDay: unknown;
}): boolean {
  if (!params.hasCompletedFirstTimeOnboarding || params.isFirstTimeFlowActive) return false;
  if (!params.allowPlanKickoff) return false;

  const todayKey = toLocalDateKey(params.now);
  if (params.lastKickoffShownDateKey === todayKey) return false;

  const cadence = normalizePlanKickoffCadence(params.planKickoffCadence);
  const dayOfWeek = params.now.getDay();
  if (cadence === 'weekdays') {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  if (cadence === 'weekly') {
    return dayOfWeek === normalizePlanKickoffWeeklyDay(params.planKickoffWeeklyDay);
  }
  return true;
}

export function PlanKickoffDrawerHost() {
  const [visible, setVisible] = useState(false);
  const lastKickoffShownDateKey = useAppStore((s) => s.lastKickoffShownDateKey);
  const setLastKickoffShownDateKey = useAppStore((s) => s.setLastKickoffShownDateKey);
  const notificationPreferences = useAppStore((s) => s.notificationPreferences);
  const setNotificationPreferences = useAppStore((s) => s.setNotificationPreferences);
  const hasCompletedFirstTimeOnboarding = useAppStore((s) => s.hasCompletedFirstTimeOnboarding);
  const isFirstTimeFlowActive = useFirstTimeUxStore((s) => s.isFlowActive);

  const checkAndShow = () => {
    setVisible(
      shouldShowPlanKickoffToday({
        now: new Date(),
        hasCompletedFirstTimeOnboarding,
        isFirstTimeFlowActive,
        lastKickoffShownDateKey,
        allowPlanKickoff: notificationPreferences.allowPlanKickoff !== false,
        planKickoffCadence: notificationPreferences.planKickoffCadence,
        planKickoffWeeklyDay: notificationPreferences.planKickoffWeeklyDay,
      }),
    );
  };

  useEffect(() => {
    checkAndShow();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkAndShow();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasCompletedFirstTimeOnboarding, isFirstTimeFlowActive, lastKickoffShownDateKey, notificationPreferences]);

  const handleDismissForToday = () => {
    setLastKickoffShownDateKey(toLocalDateKey(new Date()));
    setVisible(false);
  };

  const navigateToNotificationSettings = () => {
    if (rootNavigationRef.isReady()) {
      rootNavigationRef.navigate('Settings', { screen: 'SettingsNotifications' } as any);
    }
  };

  const handleTurnOffPrompts = () => {
    Alert.alert('Turn off prompts?', 'You can always re-enable this in Notifications settings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Manage reminders',
        onPress: () => {
          handleDismissForToday();
          navigateToNotificationSettings();
        },
      },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: () => {
          setNotificationPreferences((current) => ({
            ...current,
            allowPlanKickoff: false,
          }));
          handleDismissForToday();
        },
      },
    ]);
  };

  return (
    <BottomGuide
      visible={visible}
      onClose={handleDismissForToday}
      scrim="light"
      snapPoints={['35%']}
      dynamicSizing
    >
      <VStack space={spacing.md}>
        <VStack space={spacing.xs}>
          <Text style={styles.title}>Plan your day</Text>
          <Text style={styles.body}>
            See your calendar and commit a few recommendations.
          </Text>
        </VStack>
        <HStack>
          <Button variant="ghost" size="sm" onPress={handleTurnOffPrompts}>
            Turn off prompts
          </Button>
        </HStack>

        <HStack space={spacing.sm} style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onPress={handleDismissForToday}>
            Not now
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              handleDismissForToday();
              if (rootNavigationRef.isReady()) {
                rootNavigationRef.navigate('MainTabs', {
                  screen: 'PlanTab',
                  params: { openRecommendations: true },
                });
              }
            }}
          >
            Plan my day
          </Button>
        </HStack>
      </VStack>
    </BottomGuide>
  );
}

const styles = {
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
} as const;

