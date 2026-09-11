import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAppStore } from "../../store/useAppStore";
import { useHouseholdModeStore } from "../household/sharedDevice/useHouseholdModeStore";
import { useManagedChildAccessStore } from "../household/personalDevice/useManagedChildAccessStore";
import { getSupabaseClient } from "../../services/backend/supabaseClient";
import { readHousehold } from "../../capabilities/relationships/actions/relationshipActions";
import { createHouseholdActionBoundary } from "../household/data/householdActionBoundary";
import { getLivingPlanSettings } from "../../capabilities/money/data/livingPlanRepository";
import { loadMoneyOnboardingState } from "../../capabilities/money/runtime/moneyOnboardingStorage";
import { createMealPlanningRepository } from "../../capabilities/meal-planning/data/mealPlanningRepository";
import {
  loadHomeRecommendationEvidence,
  UNKNOWN_HOME_EVIDENCE,
} from "./homeRecommendationEvidence";
import {
  buildHomeRecommendations,
  EMPTY_HOME_RECOMMENDATION_PREFERENCES,
  selectHomeRecommendations,
  type HomeRecommendationEvidence,
  type HomeRecommendationPreferenceAction,
} from "./homeRecommendations";
import { useHomeRecommendationPreferences } from "./useHomeRecommendationPreferences";

export function useHomeRecommendations(userId: string, enabled: boolean) {
  const accountId = useAppStore((s) => s.authIdentity?.userId);
  const householdMode = useHouseholdModeStore((s) => s.session);
  const childAccess = useManagedChildAccessStore((s) => s.access);
  const childHydrated = useManagedChildAccessStore((s) => s.hydrated);
  const preferences = useHomeRecommendationPreferences(
    (s) => s.byUserId[userId] ?? EMPTY_HOME_RECOMMENDATION_PREFERENCES,
  );
  const hydrated = useHomeRecommendationPreferences((s) => s.hydrated);
  const storeDispatch = useHomeRecommendationPreferences((s) => s.dispatch);
  const allowed =
    enabled &&
    accountId === userId &&
    !householdMode &&
    !childAccess &&
    childHydrated &&
    hydrated;
  const current = useRef({ allowed, userId });
  current.current = { allowed, userId };
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    userId: string;
    evidence: HomeRecommendationEvidence;
    loading: boolean;
    partialError: boolean;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!allowed) {
        setState(null);
        return;
      }
      const isCurrent = () =>
        active && current.current.allowed && current.current.userId === userId;
      setState((old) => ({
        userId,
        evidence: old?.userId === userId ? old.evidence : UNKNOWN_HOME_EVIDENCE,
        loading: true,
        partialError: false,
      }));
      void loadHomeRecommendationEvidence(
        {
          household: async () =>
            (
              await readHousehold(
                createHouseholdActionBoundary(getSupabaseClient()),
              )
            ).result,
          money: async () => {
            const [local, settings] = await Promise.all([
              loadMoneyOnboardingState(userId),
              getLivingPlanSettings(getSupabaseClient()),
            ]);
            return {
              ...local,
              hasActivePlan: Boolean(settings.active),
              hasTarget: Boolean(settings.target),
            };
          },
          meals: () => createMealPlanningRepository().list(),
        },
        isCurrent,
      ).then((result) => {
        if (isCurrent()) setState({ ...result, userId, loading: false });
      });
      return () => {
        active = false;
      };
    }, [allowed, userId, revision]),
  );
  const evidence =
    allowed && state?.userId === userId
      ? state.evidence
      : UNKNOWN_HOME_EVIDENCE;
  const offers = useMemo(
    () => buildHomeRecommendations(evidence, preferences),
    [evidence, preferences],
  );
  const selection = selectHomeRecommendations(offers, preferences);
  const dispatch = useCallback(
    (action: HomeRecommendationPreferenceAction) => {
      if (current.current.allowed && current.current.userId === userId)
        storeDispatch(userId, action);
    },
    [storeDispatch, userId],
  );
  return {
    offers,
    ...selection,
    preferences,
    dispatch,
    eligible: allowed && evidence.access === "adult",
    loading: allowed && (!state || state.loading),
    partialError: allowed && Boolean(state?.partialError),
    retry: () => setRevision((v) => v + 1),
  };
}
