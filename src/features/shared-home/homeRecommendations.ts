/** Home owns invitations and their presentation, never capability setup truth. */
export type HomeRecommendationId = "household" | "money" | "meals";
export type HomeRecommendationStatus = "accepted" | "later" | "declined";
export type HomeRecommendationPreferences = {
  hidden: boolean;
  accepted?: Partial<Record<HomeRecommendationId, true>>;
  offers: Partial<Record<HomeRecommendationId, HomeRecommendationStatus>>;
};
export type HomeRecommendationEvidence = {
  access: "adult" | "child" | "unknown";
  household: "solo" | "together" | "unknown";
  money: "unused" | "started" | "complete" | "settled" | "unknown";
  meals: "unused" | "active" | "settled" | "unknown";
};
export type HomeRecommendation = {
  id: HomeRecommendationId;
  kind: "continue" | "discover";
  title: string;
  body: string;
  action: string;
  destination: "household" | "money" | "recipes" | "meal-planning";
};
const IDS: HomeRecommendationId[] = ["household", "money", "meals"];
export const EMPTY_HOME_RECOMMENDATION_PREFERENCES: HomeRecommendationPreferences =
  { hidden: false, offers: {} };
export function normalizeHomeRecommendationPreferences(
  value: unknown,
): HomeRecommendationPreferences {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<HomeRecommendationPreferences>)
      : {};
  const offers: HomeRecommendationPreferences["offers"] = {};
  const accepted: NonNullable<HomeRecommendationPreferences["accepted"]> = {};
  for (const id of IDS) {
    const status = candidate.offers?.[id];
    if (candidate.accepted?.[id] === true || status === "accepted")
      accepted[id] = true;
    if (status === "accepted" || status === "later" || status === "declined")
      offers[id] = status;
  }
  return {
    hidden: candidate.hidden === true,
    offers,
    ...(Object.keys(accepted).length ? { accepted } : {}),
  };
}
export type HomeRecommendationPreferenceAction =
  | { type: "hidden"; value: boolean }
  | {
      type: "offer";
      id: HomeRecommendationId;
      status: HomeRecommendationStatus | null;
    };
export function updateHomeRecommendationPreferences(
  current: HomeRecommendationPreferences,
  action: HomeRecommendationPreferenceAction,
): HomeRecommendationPreferences {
  if (action.type === "hidden") return { ...current, hidden: action.value };
  const offers = { ...current.offers };
  if (action.status === null) delete offers[action.id];
  else offers[action.id] = action.status;
  return {
    ...current,
    offers,
    ...(action.status === "accepted"
      ? { accepted: { ...current.accepted, [action.id]: true } }
      : {}),
  };
}
export function buildHomeRecommendations(
  evidence: HomeRecommendationEvidence,
  preferences: HomeRecommendationPreferences,
): HomeRecommendation[] {
  if (evidence.access !== "adult") return [];
  const offers: HomeRecommendation[] = [];
  if (evidence.household === "solo") {
    const accepted =
      preferences.accepted?.household ||
      preferences.offers.household === "accepted";
    offers.push({
      id: "household",
      kind: accepted ? "continue" : "discover",
      title: accepted
        ? "Bring your household together"
        : "Bring your people together",
      body: "Invite someone to plan and share with you.",
      action: accepted ? "Review your household" : "Explore Household",
      destination: "household",
    });
  }
  if (evidence.money === "unused" || evidence.money === "started") {
    const started = evidence.money === "started";
    const accepted =
      preferences.accepted?.money || preferences.offers.money === "accepted";
    offers.push({
      id: "money",
      kind: started || accepted ? "continue" : "discover",
      title: started
        ? "Pick up your Money setup"
        : "Know where you stand before you spend",
      body: started
        ? "Pick up where you left off."
        : "See your spending and monthly plan in one place.",
      action: started ? "Continue Money setup" : "Explore Money",
      destination: "money",
    });
  }
  if (evidence.meals === "unused" || evidence.meals === "active") {
    const active = evidence.meals === "active";
    const started =
      active ||
      preferences.accepted?.meals ||
      preferences.offers.meals === "accepted";
    offers.push({
      id: "meals",
      kind: started ? "continue" : "discover",
      title: active
        ? "Plan this week’s meals"
        : "Make the next meal easier",
      body: active
        ? "Choose what to make from your saved meals."
        : "Find a recipe for your next meal.",
      action: active ? "Continue your meal plan" : "Choose a meal",
      destination: active ? "meal-planning" : "recipes",
    });
  }
  return offers;
}
export function selectHomeRecommendations(
  offers: HomeRecommendation[],
  preferences: HomeRecommendationPreferences,
) {
  if (preferences.hidden) return { featured: null, complementary: null };
  const eligible = offers.filter(
    (o) => !["later", "declined"].includes(preferences.offers[o.id] ?? ""),
  );
  // Explicit unfinished work leads; discovery has its own visible slot and is never gated on completion.
  const featured =
    eligible.find((o) => o.kind === "continue") ?? eligible[0] ?? null;
  const complementary = featured
    ? (eligible.find((o) => o.kind !== featured.kind) ?? null)
    : null;
  return { featured, complementary };
}
