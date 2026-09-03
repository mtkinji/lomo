import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const ANALYTICS_CONSENT_VERSION = 1;

export type AnalyticsConsentStatus = 'unknown' | 'granted' | 'denied' | 'withdrawn';

export type AnalyticsConsent = {
  status: AnalyticsConsentStatus;
  policyVersion: number | null;
};

export function resolveAnalyticsConsent(consent: AnalyticsConsent): {
  enabled: boolean;
  needsChoice: boolean;
} {
  const isCurrent = consent.policyVersion === ANALYTICS_CONSENT_VERSION;
  return {
    enabled: consent.status === 'unknown' || consent.status === 'granted',
    needsChoice: !isCurrent,
  };
}

export function transitionAnalyticsConsent(
  consent: AnalyticsConsent,
  enabled: boolean,
): AnalyticsConsent {
  return {
    status: enabled ? 'granted' : resolveAnalyticsConsent(consent).enabled ? 'withdrawn' : 'denied',
    policyVersion: ANALYTICS_CONSENT_VERSION,
  };
}

type AnalyticsConsentStore = AnalyticsConsent & {
  hydrated: boolean;
  setEnabled: (enabled: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useAnalyticsConsentStore = create<AnalyticsConsentStore>()(
  persist(
    (set, get) => ({
      status: 'unknown',
      policyVersion: null,
      hydrated: false,
      setEnabled: (enabled) => set(transitionAnalyticsConsent(get(), enabled)),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'kwilt-analytics-consent',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ status, policyVersion }) => ({ status, policyVersion }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
