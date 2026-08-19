import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CapabilityMenuDestinationId } from '../capabilities/types';
import {
  createCapabilityDiscoveryState,
  initializeCapabilityDiscovery,
  markCapabilityDestinationVisited,
  markCapabilityMenuOpened,
  type CapabilityDiscoveryState,
} from '../navigation/capabilityDiscovery';
import { existingInstallationAtStartup } from '../navigation/capabilityDiscoveryStartup';

const CAPABILITY_DISCOVERY_STORAGE_KEY = 'kwilt-capability-discovery-v1';

type CapabilityDiscoveryStore = {
  discovery: CapabilityDiscoveryState;
  hydrated: boolean;
  initialize: (existingInstallation: boolean) => void;
  markMenuOpened: () => void;
  markVisited: (capabilityId: CapabilityMenuDestinationId) => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useCapabilityDiscoveryStore = create<CapabilityDiscoveryStore>()(
  persist(
    (set) => ({
      discovery: createCapabilityDiscoveryState(),
      hydrated: false,
      initialize: (existingInstallation) => set((state) => ({
        discovery: initializeCapabilityDiscovery(state.discovery, existingInstallation),
      })),
      markMenuOpened: () => set((state) => ({
        discovery: markCapabilityMenuOpened(state.discovery),
      })),
      markVisited: (capabilityId) => set((state) => ({
        discovery: markCapabilityDestinationVisited(state.discovery, capabilityId),
      })),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: CAPABILITY_DISCOVERY_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ discovery: state.discovery }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
