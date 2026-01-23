import React, { useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { BottomGuide } from '../../ui/BottomGuide';
import { VStack, Text, HStack } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { spacing, typography, colors } from '../../theme';

export function PlanKickoffDrawerHost() {
  const [visible, setVisible] = useState(false);
  const lastKickoffShownDateKey = useAppStore((s) => s.lastKickoffShownDateKey);
  const setLastKickoffShownDateKey = useAppStore((s) => s.setLastKickoffShownDateKey);

  const todayKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const checkAndShow = () => {
    // We use ISO date (YYYY-MM-DD) in local time as the key.
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    if (lastKickoffShownDateKey !== today) {
      setVisible(true);
    }
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
  }, [lastKickoffShownDateKey]);

  const handleDismissForToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    setLastKickoffShownDateKey(today);
    setVisible(false);
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
                rootNavigationRef.navigate('Plan', { openRecommendations: true } as any);
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

