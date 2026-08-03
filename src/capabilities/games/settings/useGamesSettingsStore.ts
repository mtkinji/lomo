import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type GamesSettingsState = {
  soundEnabled: boolean;
  hourglassStyle: 'physical' | 'classic' | 'simple';
  setSoundEnabled: (enabled: boolean) => void;
  setHourglassStyle: (style: GamesSettingsState['hourglassStyle']) => void;
};

export const useGamesSettingsStore = create<GamesSettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hourglassStyle: 'physical',
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHourglassStyle: (hourglassStyle) => set({ hourglassStyle }),
    }),
    {
      name: 'kwilt-games-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ soundEnabled, hourglassStyle }) => ({ soundEnabled, hourglassStyle }),
    },
  ),
);
