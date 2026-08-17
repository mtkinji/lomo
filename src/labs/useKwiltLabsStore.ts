import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  KWILT_LABS_STORAGE_KEY,
  isKwiltLabEnabled,
  setKwiltLabEnabled,
  type KwiltLabCapabilityId,
} from './kwiltLabs';

type KwiltLabsState = {
  enabledCapabilities: KwiltLabCapabilityId[];
  isEnabled: (capabilityId: KwiltLabCapabilityId) => boolean;
  setEnabled: (capabilityId: KwiltLabCapabilityId, enabled: boolean) => void;
};

export const useKwiltLabsStore = create<KwiltLabsState>()(
  persist(
    (set, get) => ({
      enabledCapabilities: [],
      isEnabled: (capabilityId) => isKwiltLabEnabled(get().enabledCapabilities, capabilityId),
      setEnabled: (capabilityId, enabled) => set((state) => ({
        enabledCapabilities: setKwiltLabEnabled(
          state.enabledCapabilities,
          capabilityId,
          enabled,
        ),
      })),
    }),
    {
      name: KWILT_LABS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ enabledCapabilities: state.enabledCapabilities }),
    },
  ),
);
