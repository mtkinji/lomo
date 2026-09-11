import type { HomeAttachment, HomeDraft } from "./sharedLifeTypes";
export const homeDraftKey = (userId: string) =>
  `kwilt:home:draft:v1:${encodeURIComponent(userId)}`;
export function placePostAttachment(value: {
  name: string;
  latitude: number;
  longitude: number;
  [key: string]: unknown;
}): HomeAttachment {
  const name = value.name.trim();
  if (
    !name ||
    name.length > 160 ||
    !Number.isFinite(value.latitude) ||
    Math.abs(value.latitude) > 90 ||
    !Number.isFinite(value.longitude) ||
    Math.abs(value.longitude) > 180
  )
    throw new Error("Choose a place with a name and location.");
  return {
    kind: "place",
    name,
    latitude: value.latitude,
    longitude: value.longitude,
  };
}
export function buildHomeDraftPayload(draft: HomeDraft, userId: string) {
  const text = draft.text.trim();
  if (!text && !draft.photos.length && !draft.attachment)
    throw new Error("Add a thought or photo.");
  if (text.length > 4000 || draft.photos.length > 4)
    throw new Error("Use up to 4,000 characters and four photos.");
  if (draft.audience === "household" && !draft.householdId)
    throw new Error("Choose your household.");
  if (draft.audience === "people" && !draft.recipientIds.length)
    throw new Error("Choose who will see this.");
  return {
    id: draft.id,
    text,
    audience: draft.audience,
    householdId: draft.audience === "people" ? null : draft.householdId,
    recipientIds:
      draft.audience === "people" ? [...new Set(draft.recipientIds)] : [],
    attachment: draft.attachment,
    media: draft.photos.map((photo, index) => ({
      path: `${userId}/${draft.id}/${photo.id}.jpg`,
      // A description improves accessibility, but must not block sharing.
      alt: photo.alt.trim() || `Photo ${index + 1}`,
      ...(photo.width && photo.height
        ? { width: photo.width, height: photo.height }
        : {}),
    })),
  };
}
export function mergeHomePage<T extends { id: string }>(
  current: T[],
  next: T[],
): T[] {
  return [
    ...new Map([...current, ...next].map((item) => [item.id, item])).values(),
  ];
}
