import type { Goal } from "../../domain/types";
import type { Place, UserPlaceRelationship } from "../../domain/places";
import type { HomeAttachment, HomeDraft } from "./sharedLifeTypes";
import { placePostAttachment } from "./sharedLifeDomain";

export type MomentMeal = {
  id: string;
  recipeId: string;
  title: string;
  completedAt: string;
};
export type MomentSuggestion = {
  id: string;
  kind: "place" | "goal" | "meal";
  title: string;
  context: string;
  at: number;
  attachment: HomeAttachment | null;
  text: string;
};
export function buildMomentSuggestions({
  userId,
  goals,
  places,
  visits,
  meals,
  now = Date.now(),
}: {
  userId: string;
  goals: Pick<Goal, "id" | "title" | "status" | "updatedAt">[];
  places: Record<string, Pick<Place, "id" | "name" | "latitude" | "longitude">>;
  visits: Pick<UserPlaceRelationship, "userId" | "placeId" | "lastVisitedAt">[];
  meals: MomentMeal[];
  now?: number;
}): MomentSuggestion[] {
  const recent = (date: string) => {
    const at = Date.parse(date);
    return Number.isFinite(at) && at <= now && at >= now - 30 * 86400000;
  };
  const rows: MomentSuggestion[] = [];
  for (const visit of visits) {
    if (visit.userId !== userId || !recent(visit.lastVisitedAt)) continue;
    const place = places[visit.placeId];
    if (!place) continue;
    try {
      const attachment = placePostAttachment(place);
      rows.push({
        id: `place:${place.id}`,
        kind: "place",
        title: place.name.trim(),
        context: "Place from Explore",
        at: Date.parse(visit.lastVisitedAt),
        attachment,
        text: "",
      });
    } catch {
      /* Incomplete places are not shareable. */
    }
  }
  for (const goal of goals) {
    if (
      goal.status !== "completed" ||
      !recent(goal.updatedAt) ||
      !goal.title.trim()
    )
      continue;
    const title = goal.title.trim().slice(0, 160);
    // updatedAt ranks available completed goals; it is not a completion timestamp.
    rows.push({
      id: `goal:${goal.id}`,
      kind: "goal",
      title,
      context: "Completed goal",
      at: Date.parse(goal.updatedAt),
      attachment: { kind: "goal_completed", title },
      text: "",
    });
  }
  for (const meal of meals) {
    if (!recent(meal.completedAt) || !meal.title.trim()) continue;
    const title = meal.title.trim().slice(0, 160);
    rows.push({
      id: `meal:${meal.recipeId}`,
      kind: "meal",
      title,
      context: "Meal you cooked",
      at: Date.parse(meal.completedAt),
      attachment: null,
      text: `Made ${title}.`,
    });
  }
  rows.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
  const unique = rows.filter(
    (row, index) => rows.findIndex((x) => x.id === row.id) === index,
  );
  const preview = unique.filter(
    (row, index) => unique.findIndex((x) => x.kind === row.kind) === index,
  );
  return [...preview, ...unique.filter((row) => !preview.includes(row))].slice(
    0,
    12,
  );
}

export function applyMomentSuggestion(
  draft: HomeDraft,
  suggestion: MomentSuggestion,
): HomeDraft {
  const text =
    !suggestion.text || draft.text.includes(suggestion.text)
      ? draft.text
      : [draft.text.trim(), suggestion.text].filter(Boolean).join("\n\n");
  return { ...draft, text, attachment: suggestion.attachment };
}
