import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { PassPatternAction } from '@/src/capabilities/games/domain/passPattern';
import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import { loadRemotePassPatternRoom, submitRemotePassPatternCommand, subscribeToRemotePassPatternRoom, type RemotePassPatternRoom } from './remotePassPatternClient';

export function useRemotePassPatternRoom(sessionId: string | null) {
  const [room, setRoom] = useState<RemotePassPatternRoom | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!sessionId) return;
    try { setRoom(await loadRemotePassPatternRoom(sessionId)); setError(null); }
    catch (next) { setError(next instanceof Error ? next.message : 'Unable to load the pattern.'); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) { setRoom(null); setLoading(false); return undefined; }
    setLoading(true);
    void reload();
    const channel = subscribeToRemotePassPatternRoom(sessionId, () => void reload());
    return () => { void getGamesSupabaseClient().removeChannel(channel); };
  }, [reload, sessionId]);

  const command = useCallback(async (participantId: string, action: PassPatternAction) => {
    if (!room || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await submitRemotePassPatternCommand({ sessionId: room.id, participantId, action, expectedStateVersion: room.stateVersion, idempotencyKey: Crypto.randomUUID() });
      setRoom((current) => current ? { ...current, state: result.state, stateVersion: result.stateVersion } : current);
    } catch (next) {
      setError(next instanceof Error ? next.message : 'That beat did not go through.');
      await reload();
    } finally { setSending(false); }
  }, [reload, room, sending]);

  return { room, loading, sending, error, reload, command };
}
