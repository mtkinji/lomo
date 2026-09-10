import type { SharedHomeDelivery } from "./sharedHomeTypes";
export type FeedPattern = "moment" | "contribution" | "message" | "request";
const patterns: Record<SharedHomeDelivery["eventKind"], "message" | "request"> =
  {
    goal_note: "message",
    goal_checkin: "message",
    goal_invitation: "request",
    game_turn: "request",
    meal_choice_round: "request",
  };
export const deliveryPattern = (kind: SharedHomeDelivery["eventKind"]) =>
  patterns[kind];
export function deliveryOutcome(d: SharedHomeDelivery): string | null {
  if (d.state === "pending" || d.state === "available") return null;
  const noun =
    d.eventKind === "goal_invitation"
      ? "Invitation"
      : d.eventKind === "game_turn"
        ? "Turn"
        : d.eventKind === "meal_choice_round"
          ? "Meal choice"
          : "Message";
  if (d.state === "unavailable") return `${noun} unavailable`;
  if (d.state === "expired") return `${noun} expired`;
  if (d.eventKind === "goal_invitation") {
    if (d.settledReason === "accepted") return "Invitation accepted";
    if (d.settledReason === "declined") return "Invitation declined";
    return "Invitation no longer needs a response";
  }
  if (d.eventKind === "meal_choice_round") {
    if (d.settledReason === "round_closed") return "Voting closed";
    if (d.settledReason === "responded") return "You responded";
    return "Meal choice no longer needs a response";
  }
  return d.eventKind === "game_turn"
    ? "Turn no longer needs a response"
    : "Message no longer active";
}
export function appreciationText(
  names: string[],
  count: number,
): string | null {
  if (!names.length)
    return count
      ? `${count} ${count === 1 ? "person" : "people"} cheered`
      : null;
  const others = Math.max(0, count - names.length);
  const people = others
    ? `${names.join(", ")} and ${others} ${others === 1 ? "other" : "others"}`
    : names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${people} cheered`;
}
