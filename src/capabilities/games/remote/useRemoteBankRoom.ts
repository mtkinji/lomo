import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import type { RemoteBankRoom } from './remoteBank';
import { loadRemoteBankRoom, submitRemoteBankCommand, subscribeToRemoteBankRoom } from './remoteBankClient';

export function useRemoteBankRoom(sessionId: string | null) {
  const [room, setRoom] = useState<RemoteBankRoom | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!sessionId) return;
    try { setRoom(await loadRemoteBankRoom(sessionId)); setError(null); }
    catch (next) { setError(next instanceof Error ? next.message : 'Unable to load the table.'); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) { setRoom(null); setLoading(false); return undefined; }
    setLoading(true);
    void reload();
    const channel = subscribeToRemoteBankRoom(sessionId, () => void reload());
    return () => { void getGamesSupabaseClient().removeChannel(channel); };
  }, [reload, sessionId]);

  const command = useCallback(async (participantId: string, actionType: 'roll' | 'bank') => {
    if (!room || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await submitRemoteBankCommand({
        sessionId: room.id,
        participantId,
        actionType,
        expectedStateVersion: room.stateVersion,
        idempotencyKey: Crypto.randomUUID(),
      });
      setRoom((current) => current ? { ...current, state: result.state, stateVersion: result.stateVersion } : current);
    } catch (next) {
      setError(next instanceof Error ? next.message : 'That move did not go through.');
      await reload();
    } finally { setSending(false); }
  }, [reload, room, sending]);

  return { room, loading, sending, error, reload, command };
}
