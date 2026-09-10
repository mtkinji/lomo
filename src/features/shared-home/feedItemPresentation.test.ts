import {
  deliveryPattern,
  deliveryOutcome,
  appreciationText,
} from "./feedItemPresentation";
import { homeFeedItemExamples } from "../dev/homeFeedItemExamples";
const sample = homeFeedItemExamples.find((e) => e.delivery)?.delivery!;
it("separates personal messages from participation independently of delivery state", () => {
  for (const e of homeFeedItemExamples.filter((e) => e.delivery))
    expect(deliveryPattern(e.delivery!.eventKind)).toBe(
      ["goal_note", "goal_checkin"].includes(e.delivery!.eventKind)
        ? "message"
        : "request",
    );
});
it("uses supported settlement evidence and never invents acceptance", () => {
  expect(
    deliveryOutcome({
      ...sample,
      eventKind: "goal_invitation",
      state: "settled",
      settledReason: "accepted",
    }),
  ).toBe("Invitation accepted");
  expect(
    deliveryOutcome({
      ...sample,
      eventKind: "goal_invitation",
      state: "settled",
      settledReason: "declined",
    }),
  ).toBe("Invitation declined");
  expect(
    deliveryOutcome({
      ...sample,
      eventKind: "goal_invitation",
      state: "settled",
      settledReason: null,
    }),
  ).toBe("Invitation no longer needs a response");
  expect(
    deliveryOutcome({
      ...sample,
      eventKind: "meal_choice_round",
      state: "settled",
      settledReason: "round_closed",
    }),
  ).toBe("Voting closed");
  expect(
    deliveryOutcome({ ...sample, eventKind: "goal_note", state: "pending" }),
  ).toBeNull();
  expect(
    deliveryOutcome({
      ...sample,
      eventKind: "goal_note",
      state: "unavailable",
    }),
  ).toBe("Message unavailable");
});
it("names available responders without double conjunctions or invented counts", () => {
  expect(appreciationText(["Maya", "Ben"], 3)).toBe(
    "Maya, Ben and 1 other cheered",
  );
  expect(appreciationText(["Maya"], 3)).toBe("Maya and 2 others cheered");
  expect(appreciationText(["Maya", "Ben"], 2)).toBe("Maya and Ben cheered");
  expect(appreciationText([], 0)).toBeNull();
});
