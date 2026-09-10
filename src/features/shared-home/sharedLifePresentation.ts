import type { HomePost } from "./sharedLifeTypes";
export function audienceLabel(
  post: Pick<HomePost, "audience" | "householdName">,
) {
  return post.audience === "household"
    ? (post.householdName ?? "Our household")
    : post.audience === "followers"
      ? `${post.householdName ? post.householdName + " · " : ""}Approved followers`
      : "Chosen people";
}
export function momentTime(value: string, now = Date.now()) {
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
export function choreHeadline(post: HomePost) {
  const items = post.choreUpdate?.items ?? [];
  const pending = items.filter((x) => x.state === "waiting_approval").length;
  const noun = items.length === 1 ? "a chore" : `${items.length} chores`;
  if (pending === items.length && pending > 0)
    return `${post.authorName} marked ${noun} done`;
  if (pending)
    return `${post.authorName} completed ${items.length - pending} · ${pending} awaiting approval`;
  return `${post.authorName} finished ${noun}`;
}
export function reconcileHomePosts(
  current: HomePost[],
  authorized: HomePost[],
  head: HomePost[],
) {
  const oldIds = new Set(current.map((p) => p.id));
  const valid = new Map(authorized.map((p) => [p.id, p]));
  return {
    posts: current.flatMap((p) => (valid.has(p.id) ? [valid.get(p.id)!] : [])),
    incoming: head.filter((p) => !oldIds.has(p.id)),
  };
}
export type HomeReadingAnchor = { id: string; within: number; order: string[] };
export function restoreHomeOffset(
  anchor: HomeReadingAnchor,
  ids: string[],
  heights: Record<string, number>,
  header: number,
  gap: number,
): number | null {
  let id = anchor.id;
  if (!ids.includes(id)) {
    const old = anchor.order.indexOf(id);
    id =
      anchor.order.slice(old + 1).find((i) => ids.includes(i)) ??
      anchor.order
        .slice(0, old)
        .reverse()
        .find((i) => ids.includes(i)) ??
      ids[0];
  }
  if (!id) return null;
  const index = ids.indexOf(id);
  return (
    header +
    ids.slice(0, index).reduce((sum, i) => sum + (heights[i] ?? 0) + gap, 0) +
    (id === anchor.id
      ? Math.min(anchor.within, Math.max(0, (heights[id] ?? 0) - 1))
      : 0)
  );
}
