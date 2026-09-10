import { publishHomeDraft } from "./sharedLifePublishing";
import type { HomeDraft } from "./sharedLifeTypes";
const draft: HomeDraft = {
  id: "post",
  text: "Hello",
  audience: "people",
  householdId: null,
  recipientIds: ["friend"],
  attachment: null,
  photos: [{ id: "photo", uri: "local", alt: "Dinner" }],
};
it("never publishes after an upload failure and retries with the same identity", async () => {
  const command = jest
    .fn()
    .mockRejectedValueOnce(new Error("missing"))
    .mockResolvedValue({});
  const upload = jest
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(undefined);
  const deps = { currentUser: () => "owner", command, upload };
  await expect(publishHomeDraft(draft, "owner", deps)).rejects.toThrow(
    "offline",
  );
  expect(command.mock.calls.map((c) => c[0])).not.toContain("publish");
  await publishHomeDraft(draft, "owner", deps);
  expect(command).toHaveBeenLastCalledWith("publish", { id: "post" });
});
it("stops an old-account operation before uploading or publishing", async () => {
  let current = "owner";
  const upload = jest.fn();
  const command = jest.fn(async (op: string) => {
    if (op === "draft") current = "other";
    return {};
  });
  await expect(
    publishHomeDraft(draft, "owner", {
      currentUser: () => current,
      command,
      upload,
    }),
  ).rejects.toThrow("account changed");
  expect(upload).not.toHaveBeenCalled();
});
it("recognizes a committed retry and does not overwrite published media", async () => {
  const command = jest.fn().mockResolvedValue({ post: { createdAt: "today" } });
  const upload = jest.fn();
  await publishHomeDraft(draft, "owner", {
    currentUser: () => "owner",
    command,
    upload,
  });
  expect(command).toHaveBeenCalledTimes(1);
  expect(upload).not.toHaveBeenCalled();
});

it("does not publish when upload is stopped", async () => {
  const controller = new AbortController();
  const draft = {
    id: "cancel",
    text: "Moment",
    audience: "people",
    householdId: null,
    recipientIds: ["friend"],
    photos: [],
    attachment: null,
  } as any;
  controller.abort();
  const command = jest.fn();
  await expect(
    publishHomeDraft(draft, "user", {
      command,
      upload: jest.fn(),
      currentUser: () => "user",
      signal: controller.signal,
    }),
  ).rejects.toThrow("Upload stopped");
  expect(command).not.toHaveBeenCalled();
});
it("reconciles an uncertain publication before reporting failure", async () => {
  let lookups = 0;
  const command = jest.fn(async (op: string) => {
    if (op === "conversation") {
      lookups++;
      if (lookups === 1) throw new Error("Missing");
      return { post: { createdAt: "today" } };
    }
    if (op === "publish") throw new Error("Response lost");
    return {};
  });
  const progress = jest.fn();
  await expect(
    publishHomeDraft(
      draft,
      "owner",
      { currentUser: () => "owner", command, upload: jest.fn() },
      progress,
    ),
  ).resolves.toBe(draft.id);
  expect(progress).toHaveBeenCalledWith("Checking your post…");
});
