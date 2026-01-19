import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { PlanPager } from './PlanPager';
import { useAppStore } from '../../store/useAppStore';

export function PlanKickoffDrawerHost() {
  const [visible, setVisible] = useState(false);
  const lastKickoffShownDateKey = useAppStore((s) => s.lastKickoffShownDateKey);
  const setLastKickoffShownDateKey = useAppStore((s) => s.setLastKickoffShownDateKey);

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

  const handleClose = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    setLastKickoffShownDateKey(today);
    setVisible(false);
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={handleClose}
      snapPoints={['90%']} // Expanded view per PRD
      dismissable
      enableContentPanningGesture
    >
      <PlanPager insetMode="drawer" targetDate={new Date()} entryPoint="kickoff" />
    </BottomDrawer>
  );
}

