import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  normalizeHomeRecommendationPreferences,
  updateHomeRecommendationPreferences,
  type HomeRecommendationPreferences,
  type HomeRecommendationPreferenceAction,
} from "./homeRecommendations";
type Store = {
  byUserId: Record<string, HomeRecommendationPreferences>;
  hydrated: boolean;
  dispatch: (
    userId: string,
    action: HomeRecommendationPreferenceAction,
  ) => void;
};
export const useHomeRecommendationPreferences = create<Store>()(
  persist(
    (set) => ({
      byUserId: {},
      hydrated: false,
      dispatch: (userId, action) => {
        if (!userId.trim()) return;
        set((state) => ({
          byUserId: {
            ...state.byUserId,
            [userId]: updateHomeRecommendationPreferences(
              normalizeHomeRecommendationPreferences(state.byUserId[userId]),
              action,
            ),
          },
        }));
      },
    }),
    {
      name: "kwilt-home-recommendations-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ byUserId: state.byUserId }),
      merge: (persisted, current) => {
        const candidate = (persisted as Partial<Store> | null)?.byUserId;
        const byUserId: Store["byUserId"] = {};
        if (candidate && typeof candidate === "object") {
          for (const [id, value] of Object.entries(candidate)) {
            if (id.trim())
              byUserId[id] = normalizeHomeRecommendationPreferences(value);
          }
        }
        return { ...current, byUserId };
      },
      onRehydrateStorage: () => () =>
        useHomeRecommendationPreferences.setState({ hydrated: true }),
    },
  ),
);
