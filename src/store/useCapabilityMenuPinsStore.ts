import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CapabilityMenuDestinationId } from '../capabilities/types';
import {
  setCapabilityPinOverride,
  type CapabilityPinOverrides,
} from '../navigation/capabilityMenuPins';

type CapabilityMenuPinsStore = {
  overridesByUserId: Record<string, CapabilityPinOverrides>;
  setPinned: (
    userId: string,
    capabilityId: CapabilityMenuDestinationId,
    pinned: boolean,
  ) => void;
};

export const useCapabilityMenuPinsStore = create<CapabilityMenuPinsStore>()(
  persist(
    (set) => ({
      overridesByUserId: {},
      setPinned: (userId, capabilityId, pinned) => set((state) => {
        const userOverrides = setCapabilityPinOverride(
          state.overridesByUserId[userId] ?? {},
          capabilityId,
          pinned,
        );
        const nextByUserId = { ...state.overridesByUserId };
        if (Object.keys(userOverrides).length === 0) {
          delete nextByUserId[userId];
        } else {
          nextByUserId[userId] = userOverrides;
        }
        return { overridesByUserId: nextByUserId };
      }),
    }),
    {
      name: 'kwilt:capability-menu-pins:v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ overridesByUserId: state.overridesByUserId }),
    },
  ),
);
