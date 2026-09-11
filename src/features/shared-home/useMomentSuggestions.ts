import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useHouseholdModeStore } from "../household/sharedDevice/useHouseholdModeStore";
import { useExploreStore } from "../../capabilities/explore/runtime/useExploreStore";
import { createRecipeCookRepository } from "../../capabilities/recipes/data/recipeCookRepository";
import { createRecipeRepository } from "../../capabilities/recipes/data/recipeRepository";
import {
  buildMomentSuggestions,
  type MomentMeal,
} from "./sharedLifeSuggestions";

export function useMomentSuggestions(userId: string) {
  const accountId = useAppStore((s) => s.authIdentity?.userId);
  const hydrated = useAppStore((s) => s.domainHydrated);
  const goals = useAppStore((s) => s.goals);
  const householdSession = useHouseholdModeStore((s) => s.session);
  const places = useExploreStore((s) => s.places);
  const relationships = useExploreStore((s) => s.placeRelationships);
  const allowed = accountId === userId && !householdSession;
  const [revision, setRevision] = useState(0);
  const [remote, setRemote] = useState<{
    userId: string;
    meals: MomentMeal[];
    loading: boolean;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    let active = true;
    if (!allowed) {
      setRemote(null);
      return;
    }
    setRemote({ userId, meals: [], loading: true, error: false });
    void (async () => {
      try {
        const records = await createRecipeCookRepository().listRecent(20);
        if (!active) return;
        const recipes = records.length
          ? await createRecipeRepository().list()
          : [];
        if (!active) return;
        const artwork = new Map(
          recipes.map((r) => [
            r.recipe.id,
            r.recipe.mediaAssets.find((m) => m.lifecycle === "active")
              ?.storageRef,
          ]),
        );
        const titles = new Map(
          recipes.map((r) => [r.recipe.id, r.currentVersion.title]),
        );
        // Project only public-to-the-draft title text, never cooking notes or ingredients.
        const meals = records.flatMap((r) => {
          const title = titles.get(r.recipeId);
          return title
            ? [
                {
                  id: r.id,
                  recipeId: r.recipeId,
                  title,
                  completedAt: r.completedAt,
                  artworkRef: artwork.get(r.recipeId),
                },
              ]
            : [];
        });
        setRemote({ userId, meals, loading: false, error: false });
      } catch {
        if (active)
          setRemote({ userId, meals: [], loading: false, error: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [allowed, userId, revision]);
  const suggestions = useMemo(
    () =>
      allowed
        ? buildMomentSuggestions({
            userId,
            goals: hydrated ? goals : [],
            places,
            visits: Object.values(relationships),
            meals: remote?.userId === userId ? remote.meals : [],
          })
        : [],
    [allowed, userId, hydrated, goals, places, relationships, remote],
  );
  return {
    suggestions,
    loading: allowed && (!remote || remote.loading),
    error: allowed && Boolean(remote?.error),
    retry: () => setRevision((r) => r + 1),
  };
}
