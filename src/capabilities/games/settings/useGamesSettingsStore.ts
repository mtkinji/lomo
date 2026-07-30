import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type GamesSettingsState = {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
};

export const useGamesSettingsStore = create<GamesSettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    {
      name: 'kwilt-games-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ soundEnabled }) => ({ soundEnabled }),
    },
  ),
);
