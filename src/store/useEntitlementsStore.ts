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

  refreshEntitlements: (params?: { force?: boolean }) => Promise<EntitlementsSnapshot>;
  restore: () => Promise<EntitlementsSnapshot>;
  purchase: (params: { plan: ProPlan; cadence: BillingCadence }) => Promise<EntitlementsSnapshot>;

  /**
   * Dev-only helper for testing gating surfaces without RevenueCat.
   * (No-op outside __DEV__.)
   */
  devSetIsPro: (isPro: boolean) => void;
};

const applySnapshot = (snapshot: EntitlementsSnapshot) => ({
  isPro: snapshot.isPro,
  lastCheckedAt: snapshot.checkedAt,
  lastSource: snapshot.source,
  lastError: snapshot.error ?? null,
  isStale: Boolean(snapshot.isStale),
});

export const useEntitlementsStore = create(
  persist<EntitlementsState>(
    (set, get) => ({
      isPro: false,
      lastCheckedAt: null,
      lastSource: null,
      lastError: null,
      isStale: true,
      isRefreshing: false,

      refreshEntitlements: async (params) => {
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
          isPro: Boolean(nextIsPro),
          lastCheckedAt: checkedAt,
          lastSource: 'cache',
          lastError: null,
          isStale: true,
        });
      },
    }),
    {
      name: 'kwilt-entitlements',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPro: state.isPro,
        lastCheckedAt: state.lastCheckedAt,
        lastSource: state.lastSource,
        lastError: state.lastError,
        isStale: state.isStale,
      }),
    },
  ),
);


