import { act, renderHook } from "@testing-library/react-native";
import { useHomeReaction } from "./useHomeReaction";
it("serializes rapid changes per post without blocking another post", async () => {
  let finish!: () => void;
  const send = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          finish = r;
        }),
    )
    .mockResolvedValue(undefined);
  const { result } = renderHook(() => useHomeReaction(send));
  act(() => {
    result.current.toggle("a", null, 0);
  });
  act(() => {
    result.current.toggle("a", null, 0);
    result.current.toggle("b", null, 0);
  });
  expect(send).toHaveBeenCalledTimes(2);
  await act(async () => {
    finish();
  });
  expect(send).toHaveBeenLastCalledWith("react", { id: "a", reaction: null });
  expect(result.current.values.a.reaction).toBeNull();
});
it("releases an optimistic count when an authorized refresh acknowledges it", async () => {
  const send = jest.fn().mockResolvedValue(undefined);
  const { result, rerender } = renderHook<ReturnType<typeof useHomeReaction>, { posts: NonNullable<Parameters<typeof useHomeReaction>[1]> }>(
    ({ posts }) => useHomeReaction(send, posts),
    {
      initialProps: {
        posts: [
          { id: "a", myReaction: null as string | null, reactionCount: 0 },
        ],
      },
    },
  );
  await act(async () => result.current.toggle("a", null, 0));
  rerender({ posts: [{ id: "a", myReaction: "heart", reactionCount: 4 }] });
  expect(result.current.values.a).toBeUndefined();
});
