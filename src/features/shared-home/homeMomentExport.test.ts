import {
  exportHomeMoment,
  type MomentExportDependencies,
} from "./homeMomentExport";
import type { HomePost } from "./sharedLifeTypes";
const post = {
  id: "p",
  text: "A walk together",
  attachment: { kind: "goal_completed", title: "First hike" },
  media: [
    { path: "private/a", alt: "Photo 1" },
    { path: "private/b", alt: "Photo 2" },
  ],
  createdAt: "2026-09-10",
  kind: "moment",
} as HomePost;
function setup() {
  const dispose = jest.fn();
  const deps: MomentExportDependencies = {
    currentUser: () => "u",
    load: jest.fn().mockResolvedValue(post),
    preparePhoto: jest
      .fn()
      .mockImplementation(async (path: string) => ({
        uri: `file:///tmp/${path.split("/").pop()}.jpg`,
        dispose,
      })),
    present: jest.fn().mockResolvedValue("dismissed"),
  };
  return { deps, dispose };
}
it("shares the reviewed words and every photo, never private URLs, and cleans up cancellation", async () => {
  const { deps, dispose } = setup();
  expect(await exportHomeMoment("p", "u", deps)).toBe("dismissed");
  expect(deps.present).toHaveBeenCalledWith({
    message: expect.stringContaining("A walk together"),
    uris: ["file:///tmp/a.jpg", "file:///tmp/b.jpg"],
  });
  expect(JSON.stringify((deps.present as jest.Mock).mock.calls)).not.toContain(
    "private/",
  );
  expect(dispose).toHaveBeenCalledTimes(2);
});
it("does not export a post after access is revoked", async () => {
  const { deps } = setup();
  (deps.load as jest.Mock).mockRejectedValue(new Error("No access"));
  await expect(exportHomeMoment("p", "u", deps)).rejects.toThrow("No access");
  expect(deps.present).not.toHaveBeenCalled();
});
it("aborts after an account switch and removes prepared files", async () => {
  const { deps, dispose } = setup();
  deps.preparePhoto = jest.fn().mockImplementation(async () => {
    deps.currentUser = () => "other";
    return { uri: "file:///tmp/a.jpg", dispose };
  });
  await expect(exportHomeMoment("p", "u", deps)).rejects.toThrow(/account/i);
  expect(deps.present).not.toHaveBeenCalled();
  expect(dispose).toHaveBeenCalledTimes(1);
});
it("does not silently share fewer photos if a download fails", async () => {
  const { deps, dispose } = setup();
  (deps.preparePhoto as jest.Mock)
    .mockResolvedValueOnce({ uri: "file:///tmp/a.jpg", dispose })
    .mockRejectedValueOnce(new Error("Download failed"));
  await expect(exportHomeMoment("p", "u", deps)).rejects.toThrow(
    "Download failed",
  );
  expect(deps.present).not.toHaveBeenCalled();
  expect(dispose).toHaveBeenCalledTimes(1);
});
it("rechecks the post after preparing media and rejects changed content", async () => {
  const { deps, dispose } = setup();
  (deps.load as jest.Mock)
    .mockResolvedValueOnce(post)
    .mockResolvedValueOnce({ ...post, text: "Changed" });
  await expect(exportHomeMoment("p", "u", deps)).rejects.toThrow(/changed/i);
  expect(deps.present).not.toHaveBeenCalled();
  expect(dispose).toHaveBeenCalledTimes(2);
});
