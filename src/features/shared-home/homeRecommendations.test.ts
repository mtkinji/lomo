import {
  buildHomeRecommendations,
  selectHomeRecommendations,
  normalizeHomeRecommendationPreferences,
  updateHomeRecommendationPreferences,
  type HomeRecommendationEvidence,
} from "./homeRecommendations";
const evidence: HomeRecommendationEvidence = {
  access: "adult",
  household: "solo",
  money: "unused",
  meals: "unused",
};
const empty = () => normalizeHomeRecommendationPreferences(undefined);
it("offers an explicit household invitation without classifying solo use as unfinished", () => {
  const offers = buildHomeRecommendations(evidence, empty());
  expect(offers[0]).toMatchObject({
    id: "household",
    kind: "discover",
    action: "Explore Household",
  });
  expect(offers.every((o) => o.kind === "discover")).toBe(true);
});
it("keeps new capability discovery visible beside unfinished work", () => {
  const offers = buildHomeRecommendations(
    { ...evidence, household: "together", meals: "active" },
    empty(),
  );
  const selected = selectHomeRecommendations(offers, empty());
  expect(selected.featured).toMatchObject({ id: "meals", kind: "continue" });
  expect(selected.complementary).toMatchObject({
    id: "money",
    kind: "discover",
  });
});
it("never treats failed source reads as unused or child access as eligibility", () => {
  expect(
    buildHomeRecommendations(
      { ...evidence, money: "unknown", meals: "unknown", household: "unknown" },
      empty(),
    ),
  ).toEqual([]);
  for (const access of ["unknown", "child"] as const)
    expect(buildHomeRecommendations({ ...evidence, access }, empty())).toEqual(
      [],
    );
});
it("removes owner-completed setup even when Home previously accepted it", () => {
  const prefs = updateHomeRecommendationPreferences(empty(), {
    type: "offer",
    id: "money",
    status: "accepted",
  });
  expect(
    buildHomeRecommendations({ ...evidence, money: "complete" }, prefs).some(
      (o) => o.id === "money",
    ),
  ).toBe(false);
});
it("invitation acceptance invites resumption without claiming owner progress", () => {
  const prefs = updateHomeRecommendationPreferences(empty(), {
    type: "offer",
    id: "meals",
    status: "accepted",
  });
  const offers = buildHomeRecommendations(evidence, prefs);
  expect(offers.find((o) => o.id === "meals")).toMatchObject({
    kind: "continue",
    action: "Choose a meal",
  });
  expect(selectHomeRecommendations(offers, prefs).complementary?.kind).toBe(
    "discover",
  );
});
it("parks and declines durably without silently selecting them again", () => {
  let prefs = updateHomeRecommendationPreferences(empty(), {
    type: "offer",
    id: "household",
    status: "later",
  });
  prefs = updateHomeRecommendationPreferences(prefs, {
    type: "offer",
    id: "money",
    status: "declined",
  });
  const restored = normalizeHomeRecommendationPreferences(
    JSON.parse(JSON.stringify(prefs)),
  );
  const offers = buildHomeRecommendations(evidence, restored);
  expect(offers).toHaveLength(3); // Still available in the user-opened overview.
  expect(selectHomeRecommendations(offers, restored).featured?.id).toBe(
    "meals",
  );
  const hidden = updateHomeRecommendationPreferences(restored, {
    type: "hidden",
    value: true,
  });
  expect(selectHomeRecommendations(offers, hidden)).toEqual({
    featured: null,
    complementary: null,
  });
});
it("normalizes corrupt persisted preferences and restores one offer without resetting others", () => {
  expect(
    normalizeHomeRecommendationPreferences({
      hidden: "yes",
      offers: { money: "done", meals: "later", secret: "accepted" },
    }),
  ).toEqual({ hidden: false, offers: { meals: "later" } });
  const prefs = normalizeHomeRecommendationPreferences({
    offers: { meals: "later", money: "declined" },
  });
  expect(
    updateHomeRecommendationPreferences(prefs, {
      type: "offer",
      id: "meals",
      status: null,
    }).offers,
  ).toEqual({ money: "declined" });
});
it("preserves accepted intent when saved for later and restored", () => {
  let prefs = updateHomeRecommendationPreferences(empty(), {
    type: "offer",
    id: "meals",
    status: "accepted",
  });
  prefs = updateHomeRecommendationPreferences(prefs, {
    type: "offer",
    id: "meals",
    status: "later",
  });
  prefs = updateHomeRecommendationPreferences(
    normalizeHomeRecommendationPreferences(JSON.parse(JSON.stringify(prefs))),
    { type: "offer", id: "meals", status: null },
  );
  expect(
    buildHomeRecommendations(evidence, prefs).find((o) => o.id === "meals")
      ?.kind,
  ).toBe("continue");
});
it("does not call accepting a Money invitation started setup", () => {
  const prefs = updateHomeRecommendationPreferences(empty(), {
    type: "offer",
    id: "money",
    status: "accepted",
  });
  expect(
    buildHomeRecommendations(evidence, prefs).find((o) => o.id === "money"),
  ).toMatchObject({ kind: "continue", action: "Explore Money" });
});
