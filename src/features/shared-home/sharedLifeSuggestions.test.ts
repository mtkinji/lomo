import {
  buildMomentSuggestions,
  applyMomentSuggestion,
} from "./sharedLifeSuggestions";
const now = Date.parse("2026-09-10T12:00:00Z");
const recent = "2026-09-09T12:00:00Z";
const goal = {
  id: "g",
  title: "Finish the garden",
  status: "completed" as const,
  updatedAt: recent,
};
const place = { id: "p", name: "Canyon park", latitude: 40, longitude: -111 };
const visit = { userId: "u", placeId: "p", lastVisitedAt: recent };
const base = {
  userId: "u",
  goals: [goal],
  places: { p: place },
  visits: [visit],
  meals: [],
  now,
};
it("uses real completed goals and only the current person’s valid recent places", () => {
  const rows = buildMomentSuggestions({
    ...base,
    goals: [
      goal,
      { ...goal, id: "active", status: "planned" },
      { ...goal, id: "old", updatedAt: "2020-01-01" },
    ],
    visits: [visit, { ...visit, userId: "other", placeId: "secret" }],
  });
  expect(rows.map((x) => x.id).sort()).toEqual(["goal:g", "place:p"]);
  expect(rows.find((x) => x.kind === "place")?.attachment).toEqual({
    kind: "place",
    name: "Canyon park",
    latitude: 40,
    longitude: -111,
  });
});
it("ignores invalid dates, unnamed places and invalid locations", () => {
  expect(
    buildMomentSuggestions({
      ...base,
      goals: [{ ...goal, updatedAt: "bad" }],
      places: { p: { ...place, latitude: 100 } },
    }),
  ).toEqual([]);
  expect(
    buildMomentSuggestions({
      ...base,
      goals: [],
      places: { p: { ...place, name: " " } },
    }),
  ).toEqual([]);
});
it("gives the first three choices variety and deduplicates repeated meals", () => {
  const rows = buildMomentSuggestions({
    ...base,
    visits: [visit, ...[1, 2, 3].map((n) => ({ ...visit, placeId: `p${n}` }))],
    places: Object.fromEntries([
      ["p", place],
      ...[1, 2, 3].map((n) => [`p${n}`, { ...place, id: `p${n}` }]),
    ]),
    meals: [
      { id: "m", recipeId: "r", title: "Tacos", completedAt: recent },
      { id: "m2", recipeId: "r", title: "Tacos", completedAt: recent },
    ],
  });
  expect(new Set(rows.slice(0, 3).map((x) => x.kind)).size).toBe(3);
  expect(rows.filter((x) => x.kind === "meal")).toHaveLength(1);
  expect(rows.find((x) => x.kind === "meal")).toMatchObject({
    text: "Made Tacos.",
    attachment: null,
  });
});
it("preserves words, photos and audience when choosing a suggestion", () => {
  const draft = {
    id: "d",
    text: "Family night",
    photos: [],
    audience: "household" as const,
    householdId: "h",
    recipientIds: [],
    attachment: null,
  };
  const suggestion = buildMomentSuggestions({
    ...base,
    meals: [{ id: "m", recipeId: "r", title: "Tacos", completedAt: recent }],
  }).find((x) => x.kind === "meal")!;
  expect(applyMomentSuggestion(draft, suggestion)).toEqual({
    ...draft,
    text: "Family night\n\nMade Tacos.",
  });
  expect(
    applyMomentSuggestion(applyMomentSuggestion(draft, suggestion), suggestion)
      .text,
  ).toBe("Family night\n\nMade Tacos.");
});
it("keeps thumbnail metadata out of the shareable attachment", () => {
  const row = buildMomentSuggestions({
    ...base,
    goals: [{ ...goal, thumbnailUrl: "https://example.com/goal.jpg" }],
  }).find((r) => r.kind === "goal")!;
  expect(row.artwork).toEqual({
    kind: "image",
    uri: "https://example.com/goal.jpg",
  });
  expect(row.attachment).toEqual({ kind: "goal_completed", title: goal.title });
});
