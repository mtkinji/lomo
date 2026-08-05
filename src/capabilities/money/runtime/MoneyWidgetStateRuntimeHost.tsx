import { useEffect } from 'react';
import { createMoneyRepository } from '../data/moneyRepository';
import { clearMoneyGlanceableState, syncMoneyGlanceableState } from './moneyGlanceableState';
import { moneySnapshotCache } from './moneySnapshotCache';

export function MoneyWidgetStateRuntimeHost({ userId }: { userId: string | null }) {
  useEffect(() => {
    let cancelled = false;
    const normalizedUserId = userId?.trim() ?? '';

    const publish = async () => {
      await clearMoneyGlanceableState();
      if (cancelled || !normalizedUserId) return;

      const cached = await moneySnapshotCache.load(normalizedUserId);
      if (!cancelled && cached) await syncMoneyGlanceableState(cached);

      try {
        const fresh = await createMoneyRepository().loadSnapshot();
        if (cancelled) return;
        await moneySnapshotCache.save(normalizedUserId, fresh);
        if (!cancelled) await syncMoneyGlanceableState(fresh);
      } catch {
        // Cached categories remain available while the authoritative source is offline.
      }
    };

    void publish();
    return () => { cancelled = true; };
  }, [userId]);

  return null;
}
