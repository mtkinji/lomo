import type { HomePost } from "./sharedLifeTypes";
export type MomentExportDependencies = {
  currentUser: () => string | null;
  load: (id: string) => Promise<HomePost>;
  preparePhoto: (path: string) => Promise<{ uri: string; dispose: () => void }>;
  present: (copy: {
    message: string;
    uris: string[];
  }) => Promise<"shared" | "dismissed">;
};
function content(post: HomePost) {
  if (post.kind === "chore_update" || !post.createdAt)
    throw new Error("This moment cannot be shared.");
  const attachment = post.attachment;
  const context = !attachment
    ? ""
    : attachment.kind === "place"
      ? `${attachment.name}\nhttps://maps.apple.com/?ll=${attachment.latitude},${attachment.longitude}`
      : `${attachment.kind === "goal_completed" ? "Goal completed: " : ""}${attachment.title}`;
  return {
    message: [
      post.text.trim(),
      context,
      "Shared from Kwilt · https://kwilt.app",
    ]
      .filter(Boolean)
      .join("\n\n"),
    paths: post.media.map((m) => m.path),
  };
}
/** Export an authorized snapshot, never a private media link or an implicit audience change. */
export async function exportHomeMoment(
  id: string,
  userId: string,
  deps: MomentExportDependencies,
) {
  const check = () => {
    if (deps.currentUser() !== userId)
      throw new Error("Your account changed. Reopen Home to share.");
  };
  const files: { uri: string; dispose: () => void }[] = [];
  check();
  try {
    const post = await deps.load(id);
    check();
    const snapshot = content(post);
    for (const path of snapshot.paths) {
      files.push(await deps.preparePhoto(path));
      check();
    }
    const latest = await deps.load(id);
    check();
    if (JSON.stringify(content(latest)) !== JSON.stringify(snapshot))
      throw new Error("This moment changed. Reopen it before sharing.");
    return await deps.present({
      message: snapshot.message,
      uris: files.map((f) => f.uri),
    });
  } finally {
    for (const file of files) {
      try {
        file.dispose();
      } catch {
        /* OS cache reclamation remains available. */
      }
    }
  }
}
