import {
  buildHomeDraftPayload,
  homeDraftKey,
  placePostAttachment,
  mergeHomePage,
} from "./sharedLifeDomain";
const id = "00000000-0000-4000-8000-000000000001";
it("never carries route history or hidden place fields into an attachment", () => {
  expect(
    placePostAttachment({
      name: "Park",
      latitude: 40,
      longitude: -111,
      route: [1, 2],
    }),
  ).toEqual({ kind: "place", name: "Park", latitude: 40, longitude: -111 });
  expect(() =>
    placePostAttachment({ name: "Bad", latitude: 200, longitude: 1 }),
  ).toThrow();
});
it("keeps draft namespaces distinct across accounts", () => {
  expect(homeDraftKey("a")).not.toBe(homeDraftKey("b"));
});
it("uses stable draft identity and refuses an empty post or missing audience", () => {
  const draft = {
    id,
    text: "  A little moment  ",
    audience: "people" as const,
    householdId: null,
    recipientIds: [id],
    photos: [],
    attachment: null,
  };
  expect(buildHomeDraftPayload(draft, id)).toMatchObject({
    id,
    text: "A little moment",
    recipientIds: [id],
  });
  expect(() =>
    buildHomeDraftPayload({ ...draft, recipientIds: [] }, id),
  ).toThrow();
  expect(() => buildHomeDraftPayload({ ...draft, text: "" }, id)).toThrow();
});
it("deduplicates page boundaries and preserves newest values", () => {
  expect(
    mergeHomePage(
      [{ id: "a", text: "old" }],
      [
        { id: "a", text: "new" },
        { id: "b", text: "next" },
      ],
    ),
  ).toEqual([
    { id: "a", text: "new" },
    { id: "b", text: "next" },
  ]);
});
