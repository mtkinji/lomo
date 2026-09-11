import { Platform, Share } from "react-native";
import { File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { fetch as expoFetch } from "expo/fetch";
import KwiltShareSheet from "../../../modules/kwilt-share-sheet";
import { useAppStore } from "../../store/useAppStore";
import { useToastStore } from "../../store/useToastStore";
import { useHouseholdModeStore } from "../household/sharedDevice/useHouseholdModeStore";
import { getSharedLifeRepository } from "./sharedLifeRepository";
import { homePhotoSource } from "./sharedLifeMedia";
import { exportHomeMoment } from "./homeMomentExport";
let sharing = false;
export async function shareHomeMoment(id: string, userId: string) {
  if (sharing) return;
  sharing = true;
  const toast = useToastStore.getState().showToast;
  try {
    await exportHomeMoment(id, userId, {
      currentUser: () =>
        useHouseholdModeStore.getState().session
          ? null
          : (useAppStore.getState().authIdentity?.userId ?? null),
      load: async (postId) =>
        (await getSharedLifeRepository().conversation(postId)).post,
      preparePhoto: async (path) => {
        const source = await homePhotoSource(path);
        const response = await expoFetch(source.uri, {
          headers: source.headers,
        });
        if (!response.ok)
          throw new Error("A photo could not be prepared. Try sharing again.");
        const file = new File(Paths.cache, `kwilt-moment-${randomUUID()}.jpg`);
        try {
          file.write(new Uint8Array(await response.arrayBuffer()));
        } catch (error) {
          if (file.exists) file.delete();
          throw error;
        }
        return {
          uri: file.uri,
          dispose: () => {
            if (file.exists) file.delete();
          },
        };
      },
      present: async (copy) => {
        if (Platform.OS === "ios" && KwiltShareSheet?.presentMoment) {
          const result = await KwiltShareSheet.presentMoment(
            copy.message,
            copy.uris,
          );
          return result.action === "shared" ? "shared" : "dismissed";
        }
        if (copy.uris.length)
          throw new Error(
            "This build cannot share photo copies yet. Update Kwilt and try again.",
          );
        const result = await Share.share({ message: copy.message });
        return result.action === Share.sharedAction ? "shared" : "dismissed";
      },
    });
  } catch (error) {
    toast({
      message:
        error instanceof Error
          ? error.message
          : "This moment could not be shared.",
      variant: "default",
    });
  } finally {
    sharing = false;
  }
}
