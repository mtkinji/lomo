import { useAppStore } from '../store/useAppStore';
import { useEntitlementsStore } from '../store/useEntitlementsStore';

const ENTITLEMENTS_IDENTIFY_TIMEOUT_MS = 8_000;

let started = false;
let stopAuthSub: (() => void) | null = null;
let activeGeneration = 0;
let activeUserId: string | null = null;

async function identifyWithTimeout(userId: string, generation: number): Promise<void> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<'timeout'>((resolve) => {
    timeoutId = setTimeout(() => resolve('timeout'), ENTITLEMENTS_IDENTIFY_TIMEOUT_MS);
  });
  const entitlements = useEntitlementsStore.getState();
  let result: 'resolved' | 'timeout';
  try {
    result = await Promise.race([
      entitlements.identifyAndRefresh(userId).then(() => 'resolved' as const),
      timeout,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  if (generation !== activeGeneration || activeUserId !== userId) {
    return;
  }

  if (result === 'timeout') {
    useEntitlementsStore.setState({
      isIdentifying: false,
      isRefreshing: false,
      lastResolvedAppUserID: userId,
      lastError: 'Timed out while restoring subscription status',
      isStale: true,
    });
  }
}

export function startEntitlementsAuthSync(): void {
  if (started) return;
  started = true;

  stopAuthSub = useAppStore.subscribe(
    (s) => s.authIdentity,
    (identity) => {
      const userId = identity?.userId?.trim() ?? '';
      activeGeneration += 1;
      const generation = activeGeneration;

      if (!userId) {
        activeUserId = null;
        useEntitlementsStore.getState().clearSignedInEntitlements();
        return;
      }

      const currentEntitlements = useEntitlementsStore.getState();
      if (
        currentEntitlements.identifiedAppUserID &&
        currentEntitlements.identifiedAppUserID !== userId
      ) {
        currentEntitlements.clearSignedInEntitlements();
      }

      activeUserId = userId;
      void identifyWithTimeout(userId, generation).catch((error) => {
        if (generation !== activeGeneration || activeUserId !== userId) return;
        const message = typeof error?.message === 'string' ? error.message : 'Failed to restore subscription status';
        useEntitlementsStore.setState({
          isIdentifying: false,
          isRefreshing: false,
          lastResolvedAppUserID: userId,
          lastError: message,
          isStale: true,
        });
      });
    },
    { fireImmediately: true } as any,
  );
}

export function stopEntitlementsAuthSync(): void {
  stopAuthSub?.();
  stopAuthSub = null;
  started = false;
  activeGeneration += 1;
  activeUserId = null;
}

export function resetEntitlementsAuthSyncForTests(): void {
  stopEntitlementsAuthSync();
  activeGeneration = 0;
}
