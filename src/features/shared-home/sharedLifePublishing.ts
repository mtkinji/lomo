import type { HomeDraft } from "./sharedLifeTypes";
import { buildHomeDraftPayload } from "./sharedLifeDomain";
export type HomePublishingDependencies = {
  signal?: AbortSignal;
  currentUser: () => string | null;
  command: (op: string, args: object) => Promise<unknown>;
  upload: (uri: string, path: string) => Promise<void>;
};
/** Stable ID is the retry key; publication never precedes successful media upload. */
export async function publishHomeDraft(
  draft: HomeDraft,
  userId: string,
  deps: HomePublishingDependencies,
  progress: (label: string) => void = () => undefined,
) {
  const checkAccount = () => {
    if (deps.signal?.aborted)
      throw new Error("Upload stopped. Your draft is saved.");
    if (deps.currentUser() !== userId)
      throw new Error("Your account changed. Reopen Home to continue.");
  };
  checkAccount();
  const payload = buildHomeDraftPayload(draft, userId);
  // An uncertain prior publish may already have committed. Check before touching immutable photos.
  try {
    const existing = await deps.command("conversation", { id: draft.id });
    checkAccount();
    if (existing && typeof existing === "object" && "post" in existing) {
      const post = existing.post;
      if (
        post &&
        typeof post === "object" &&
        "createdAt" in post &&
        post.createdAt
      )
        return draft.id;
    }
  } catch (error) {
    checkAccount();
    // Missing/unpublished drafts are expected; saving below remains authoritative.
  }
  progress("Saving your post…");
  await deps.command("draft", payload);
  checkAccount();
  for (const [index, photo] of draft.photos.entries()) {
    progress(`Uploading photo ${index + 1} of ${draft.photos.length}…`);
    await deps.upload(photo.uri, payload.media[index].path);
    checkAccount();
  }
  progress("Publishing…");
  try {
    await deps.command("publish", { id: draft.id });
  } catch {
    checkAccount();
    progress("Checking your post…");
    try {
      const existing = (await deps.command("conversation", {
        id: draft.id,
      })) as { post?: { createdAt?: string } };
      checkAccount();
      if (existing?.post?.createdAt) return draft.id;
    } catch {
      checkAccount();
    }
    throw new Error(
      "Publication could not be confirmed. Your draft is kept. Try again to check this same post before publishing.",
    );
  }
  checkAccount();
  return draft.id;
}
