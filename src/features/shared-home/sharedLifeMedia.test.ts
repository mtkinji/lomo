import { homePhotoSource, uploadHomePhoto } from "./sharedLifeMedia";
import { fetch as expoFetch } from "expo/fetch";
import { randomUUID } from "expo-crypto";
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn() }));
jest.mock("../../services/backend/auth", () => ({
  getAccessToken: jest.fn().mockResolvedValue("test-token"),
}));
jest.mock("../../utils/getEnv", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabasePublishableKey: () => "test-key",
}));
jest.mock("expo/fetch", () => ({
  fetch: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));
it("revalidates photo reads and avoids storing long-lived CDN responses", async () => {
  jest
    .mocked(randomUUID)
    .mockReturnValueOnce("first")
    .mockReturnValueOnce("second")
    .mockReturnValueOnce("upload");
  const first = await homePhotoSource("user/post/photo.jpg"),
    second = await homePhotoSource("user/post/photo.jpg");
  expect(first.uri).not.toBe(second.uri);
  expect(first.headers["Cache-Control"]).toBe("no-store");
  await uploadHomePhoto("file:///photo.jpg", "user/post/photo.jpg");
  expect(expoFetch).toHaveBeenCalledWith(
    "https://example.supabase.co/storage/v1/object/home-moments/user/post/photo.jpg",
    expect.objectContaining({
      headers: expect.objectContaining({ "Cache-Control": "max-age=0" }),
    }),
  );
});
