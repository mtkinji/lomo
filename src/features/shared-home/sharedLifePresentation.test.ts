import {
  choreHeadline,
  audienceLabel,
  reconcileHomePosts,
} from "./sharedLifePresentation";
import type { HomePost } from "./sharedLifeTypes";
const post = (id: string) =>
  ({
    id,
    createdAt: id,
    authorName: "Sam",
    choreUpdate: { items: [] },
  }) as unknown as HomePost;
it("keeps approval separate from completion", () => {
  const p = {
    ...post("1"),
    choreUpdate: { items: [{ state: "waiting_approval" }] },
  } as HomePost;
  expect(choreHeadline(p)).toBe("Sam marked a chore done");
});
it("removes revoked rows while queuing newly arrived rows", () => {
  const a = post("1"),
    b = post("2"),
    c = post("3");
  expect(reconcileHomePosts([a, b], [b], [c])).toEqual({
    posts: [b],
    incoming: [c],
  });
});
it("names household audiences explicitly", () =>
  expect(
    audienceLabel({
      ...post("1"),
      audience: "household",
      householdName: "Our family",
    }),
  ).toBe("Our family"));
it("restores a deleted reading anchor to the next surviving neighbor", () => {
  const { restoreHomeOffset } = require("./sharedLifePresentation");
  expect(
    restoreHomeOffset(
      { id: "b", within: 12, order: ["a", "b", "c"] },
      ["a", "c"],
      { a: 100, c: 80 },
      40,
      32,
    ),
  ).toBe(172);
  expect(
    restoreHomeOffset(
      { id: "c", within: 12, order: ["a", "b", "c"] },
      ["a", "c"],
      { a: 100, c: 80 },
      40,
      32,
    ),
  ).toBe(184);
});
