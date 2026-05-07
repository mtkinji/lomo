import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type SharingReminderFrequency = 'default' | 'less' | 'off';

type SharingSettingsState = {
  masterMuted: boolean;
  reminderFrequency: SharingReminderFrequency;
  setMasterMuted: (muted: boolean) => void;
  setReminderFrequency: (frequency: SharingReminderFrequency) => void;
};

export const useSharingSettingsStore = create<SharingSettingsState>()(
  persist(
    (set) => ({
      masterMuted: false,
      reminderFrequency: 'default',
      setMasterMuted: (masterMuted) => set({ masterMuted }),
      setReminderFrequency: (reminderFrequency) => set({ reminderFrequency }),
    }),
    {
      name: 'kwilt-sharing-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
