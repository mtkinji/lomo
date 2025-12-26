import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BillingCadence, EntitlementsSnapshot, ProPlan } from '../services/entitlements';
import { getEntitlements, purchaseProSku, restorePurchases } from '../services/entitlements';

export type EntitlementsState = {
  isPro: boolean;
  lastCheckedAt: string | null;
  lastSource: EntitlementsSnapshot['source'] | null;
  lastError: string | null;
  isStale: boolean;
  isRefreshing: boolean;
  /**
   * Dev-only override for gating QA. When set, Pro status should not be overwritten
   * by any refresh calls (including "force").
   */
  devOverrideIsPro: boolean | null;

  refreshEntitlements: (params?: { force?: boolean }) => Promise<EntitlementsSnapshot>;
  restore: () => Promise<EntitlementsSnapshot>;
  purchase: (params: { plan: ProPlan; cadence: BillingCadence }) => Promise<EntitlementsSnapshot>;

  /**
   * Dev-only helper for testing gating surfaces without RevenueCat.
   * (No-op outside __DEV__.)
   */
  devSetIsPro: (isPro: boolean) => void;
  devClearProOverride: () => void;
};

const applySnapshot = (snapshot: EntitlementsSnapshot) => ({
  isPro: snapshot.isPro,
  lastCheckedAt: snapshot.checkedAt,
  lastSource: snapshot.source,
  lastError: snapshot.error ?? null,
  isStale: Boolean(snapshot.isStale),
});

export const useEntitlementsStore = create<EntitlementsState>()(
  persist(
    (set, get) => ({
      isPro: false,
      lastCheckedAt: null,
      lastSource: null,
      lastError: null,
      isStale: true,
      isRefreshing: false,
      devOverrideIsPro: null,

      refreshEntitlements: async (params) => {
        // In dev, an explicit override should always win and should not be
        // overwritten by a refresh (even "force").
        if (__DEV__ && get().devOverrideIsPro != null) {
          const checkedAt = new Date().toISOString();
          const snapshot: EntitlementsSnapshot = {
            isPro: Boolean(get().devOverrideIsPro),
            checkedAt,
            source: 'dev',
            isStale: true,
          };
          set({ ...applySnapshot(snapshot), isRefreshing: false });
          return snapshot;
        }

        if (get().isRefreshing) {
          // Avoid duplicate concurrent refreshes; return whatever we last had.
          return {
            isPro: get().isPro,
            checkedAt: get().lastCheckedAt ?? new Date().toISOString(),
            source: get().lastSource ?? 'cache',
            isStale: get().isStale,
            error: get().lastError ?? undefined,
          };
        }
        set({ isRefreshing: true, lastError: null });
        try {
          const snapshot = await getEntitlements({ forceRefresh: Boolean(params?.force) });
          set({ ...applySnapshot(snapshot), isRefreshing: false });
          return snapshot;
        } catch (e: any) {
          const message = typeof e?.message === 'string' ? e.message : 'Failed to refresh entitlements';
          set({ isRefreshing: false, lastError: message, isStale: true });
          return {
            isPro: get().isPro,
            checkedAt: get().lastCheckedAt ?? new Date().toISOString(),
            source: get().lastSource ?? 'cache',
            isStale: true,
            error: message,
          };
        }
      },

      restore: async () => {
        set({ isRefreshing: true, lastError: null });
        try {
          const snapshot = await restorePurchases();
          set({ ...applySnapshot(snapshot), isRefreshing: false });
          return snapshot;
        } catch (e: any) {
          const message = typeof e?.message === 'string' ? e.message : 'Failed to restore purchases';
          set({ isRefreshing: false, lastError: message, isStale: true });
          throw e;
        }
      },

      purchase: async (params) => {
        set({ isRefreshing: true, lastError: null });
        try {
          const snapshot = await purchaseProSku(params);
          set({ ...applySnapshot(snapshot), isRefreshing: false });
          return snapshot;
        } catch (e: any) {
          const message = typeof e?.message === 'string' ? e.message : 'Purchase failed';
          set({ isRefreshing: false, lastError: message, isStale: true });
          throw e;
        }
      },

      devSetIsPro: (nextIsPro) => {
        if (!__DEV__) return;
        const checkedAt = new Date().toISOString();
        set({
          devOverrideIsPro: Boolean(nextIsPro),
          isPro: Boolean(nextIsPro),
          lastCheckedAt: checkedAt,
          lastSource: 'dev',
          lastError: null,
          isStale: true,
        });
      },

      devClearProOverride: () => {
        if (!__DEV__) return;
        set({ devOverrideIsPro: null });
      },
    }),
    {
      name: 'kwilt-entitlements',
      storage: createJSONStorage(() => AsyncStorage),
      // Avoid a dev-only race where toggling Pro before hydration finishes can be
      // overwritten by older persisted state.
      merge: (persisted, current) => {
        const persistedState = (persisted ?? {}) as Partial<EntitlementsState>;
        const merged = { ...current, ...persistedState } as EntitlementsState;

        if (__DEV__ && current.devOverrideIsPro != null) {
          merged.devOverrideIsPro = current.devOverrideIsPro;
          merged.isPro = current.isPro;
          merged.lastCheckedAt = current.lastCheckedAt;
          merged.lastSource = current.lastSource;
          merged.lastError = current.lastError;
          merged.isStale = current.isStale;
        }
        return merged;
      },
      partialize: (state) => ({
        isPro: state.isPro,
        lastCheckedAt: state.lastCheckedAt,
        lastSource: state.lastSource,
        lastError: state.lastError,
        isStale: state.isStale,
        devOverrideIsPro: state.devOverrideIsPro,
      }),
    },
  ),
);


