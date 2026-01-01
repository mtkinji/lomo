import { useEffect } from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AppShell } from '../../ui/layout/AppShell';
import type { JoinSharedGoalRouteParams } from '../../navigation/routeParams';
import { useJoinSharedGoalDrawerStore } from '../../store/useJoinSharedGoalDrawerStore';

type JoinSharedGoalRouteProp = RouteProp<{ JoinSharedGoal: JoinSharedGoalRouteParams }, 'JoinSharedGoal'>;

export function JoinSharedGoalScreen() {
  const route = useRoute<JoinSharedGoalRouteProp>();
  const navigation = useNavigation<any>();
  const inviteCode = (route.params?.inviteCode ?? '').trim();

  useEffect(() => {
    const code = inviteCode.trim();
    if (code) {
      useJoinSharedGoalDrawerStore.getState().open({ inviteCode: code, source: 'route' });
    }
    // Immediately return to the Goals canvas so the user never "sees" a join page.
    try {
      navigation.replace('GoalsList');
    } catch {
      navigation.navigate('GoalsList');
    }
  }, [inviteCode, navigation]);

  return (
    <AppShell>
      <View style={{ flex: 1 }} />
    </AppShell>
  );
}


