import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getGamesSupabaseClient } from '@/src/capabilities/games/platform/supabase';
import {
  loadRemoteSlanguageRoom,
  submitRemoteSlanguageCommand,
  subscribeToSlanguageRoom,
  type RemoteSlanguageAction,
  type RemoteSlanguageRoom,
} from './remoteSlanguageClient';

export function useRemoteSlanguageRoom(sessionId: string | null) {
  const [room, setRoom] = useState<RemoteSlanguageRoom | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!sessionId) return;
    try { setRoom(await loadRemoteSlanguageRoom(sessionId)); setError(null); }
    catch (next) { setError(next instanceof Error ? next.message : 'Unable to load Slanguage.'); }
    finally { setLoading(false); }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) { setRoom(null); setLoading(false); return undefined; }
    setLoading(true);
    void reload();
    const channel = subscribeToSlanguageRoom(sessionId, () => void reload());
    return () => { void getGamesSupabaseClient().removeChannel(channel); };
  }, [reload, sessionId]);

  useEffect(() => {
    if (!room?.state.deadline) return undefined;
    const delay = Math.max(100, new Date(room.state.deadline).getTime() - Date.now() + 150);
    const timeout = setTimeout(() => void reload(), delay);
    return () => clearTimeout(timeout);
  }, [reload, room?.state.deadline]);

  useEffect(() => {
    if (room?.state.phase !== 'lobby') return undefined;
    const interval = setInterval(() => void reload(), 2_000);
    return () => clearInterval(interval);
  }, [reload, room?.state.phase]);

  const command = useCallback(async (action: RemoteSlanguageAction) => {
    if (!room || sending) return;
    setSending(true);
    setError(null);
    try {
      setRoom(await submitRemoteSlanguageCommand({
        sessionId: room.id,
        action,
        expectedStateVersion: room.stateVersion,
        idempotencyKey: Crypto.randomUUID(),
      }));
    } catch (next) {
      setError(next instanceof Error ? next.message : 'That move did not go through.');
      await reload();
    } finally { setSending(false); }
  }, [reload, room, sending]);

  return { room, loading, sending, error, reload, command };
}
