import { GameShelfScreen } from '@/src/capabilities/games/features/home/GameShelfScreen';
import { router, useLocalSearchParams } from '@/src/capabilities/games/navigation/gamesRouter';

export function JoinTableScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return (
    <GameShelfScreen
      joinInitiallyOpen
      initialJoinToken={token}
      onJoinDrawerClose={() => router.replace('/')}
    />
  );
}
