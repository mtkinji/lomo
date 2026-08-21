import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  mergeMoneyTransactionsAvailability,
  type MoneyTransactionsAvailability,
} from '../domain/moneyOnboarding';

type MoneyNavigationAvailabilityState = {
  transactionsByUserId: Record<string, MoneyTransactionsAvailability>;
  recordTransactionsAvailability: (
    userId: string,
    availability: MoneyTransactionsAvailability,
  ) => void;
};

export const useMoneyNavigationAvailabilityStore = create<MoneyNavigationAvailabilityState>()(
  persist(
    (set) => ({
      transactionsByUserId: {},
      recordTransactionsAvailability: (userId, availability) => set((state) => ({
        transactionsByUserId: {
          ...state.transactionsByUserId,
          [userId]: mergeMoneyTransactionsAvailability(
            state.transactionsByUserId[userId] ?? 'unknown',
            availability,
          ),
        },
      })),
    }),
    {
      name: 'kwilt:money:navigation-availability:v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ transactionsByUserId: state.transactionsByUserId }),
    },
  ),
);
