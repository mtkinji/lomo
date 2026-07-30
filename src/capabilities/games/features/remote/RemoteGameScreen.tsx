import { useEffect, useState } from 'react';
import { useLocalSearchParams } from '@/src/capabilities/games/navigation/gamesRouter';
import { Text } from 'react-native';
import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import { ConnectionGameFrame, PlayCard } from '@/src/capabilities/games/features/connection-games/ConnectionGameFrame';
import { RemotePassPatternScreen } from '@/src/capabilities/games/features/connection-games/RemotePassPatternScreen';
import { RemoteBankScreen } from '@/src/capabilities/games/features/tumble/RemoteBankScreen';
import { RemoteSlanguageScreen } from '@/src/capabilities/games/features/connection-games/RemoteSlanguageScreen';

export function RemoteGameScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [gameKey, setGameKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!sessionId) { setError('This room is missing its session.'); return; }
    void getGamesSupabaseClient().from('game_sessions').select('game_key').eq('id', sessionId).single()
      .then(({ data, error: nextError }) => nextError ? setError(nextError.message) : setGameKey(data.game_key));
  }, [sessionId]);
  if (gameKey === 'bank') return <RemoteBankScreen />;
  if (gameKey === 'pass-pattern') return <RemotePassPatternScreen />;
  if (gameKey === 'slanguage') return <RemoteSlanguageScreen />;
  return <ConnectionGameFrame title="Joining game" promise="Opening the private room."><PlayCard tone="paper"><Text>{error ?? 'Loading…'}</Text></PlayCard></ConnectionGameFrame>;
}
