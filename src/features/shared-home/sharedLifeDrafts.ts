import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Directory, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
import { homeDraftKey } from "./sharedLifeDomain";
import type { HomeDraft, HomePhoto } from "./sharedLifeTypes";
let writeQueue: Promise<void> = Promise.resolve();
export async function loadHomeDraft(userId: string): Promise<HomeDraft | null> {
  await writeQueue;
  const raw = await AsyncStorage.getItem(homeDraftKey(userId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value?.id &&
      Array.isArray(value.photos) &&
      Array.isArray(value.recipientIds)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function saveHomeDraft(
  userId: string,
  draft: HomeDraft | null,
): Promise<void> {
  const operation = writeQueue
    .catch(() => undefined)
    .then(() =>
      draft
        ? AsyncStorage.setItem(homeDraftKey(userId), JSON.stringify(draft))
        : AsyncStorage.removeItem(homeDraftKey(userId)),
    );
  writeQueue = operation.catch(() => undefined);
  return operation;
}
export async function keepHomePhoto(
  userId: string,
  uri: string,
): Promise<HomePhoto> {
  const id = randomUUID();
  const image = await manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.82,
    format: SaveFormat.JPEG,
  });
  const directory = new Directory(Paths.document, "home-drafts", userId);
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${id}.jpg`);
  new File(image.uri).copy(file);
  return {
    id,
    uri: file.uri,
    alt: "",
    width: image.width,
    height: image.height,
  };
}
export function removeHomeDraftPhotos(draft: HomeDraft) {
  for (const photo of draft.photos) {
    try {
      new File(photo.uri).delete();
    } catch {
      /* Already removed. */
    }
  }
}

export async function loadPendingHomeMoments(
  userId: string,
): Promise<import("./sharedLifeTypes").HomeAttachment[]> {
  await writeQueue;
  const raw = await AsyncStorage.getItem(`${homeDraftKey(userId)}:offers`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
export function savePendingHomeMoments(
  userId: string,
  moments: import("./sharedLifeTypes").HomeAttachment[],
): Promise<void> {
  const operation = writeQueue
    .catch(() => undefined)
    .then(() =>
      AsyncStorage.setItem(
        `${homeDraftKey(userId)}:offers`,
        JSON.stringify(moments),
      ),
    );
  writeQueue = operation.catch(() => undefined);
  return operation;
}
