import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useSharedLifeDeliveries } from "./useSharedLifeDeliveries";
import type { SharedLifeRepository } from "./sharedLifeRepository";
const mockList = jest.fn();
const mockSubscribe = jest.fn();
jest.mock("./sharedHomeRepository", () => ({
  getSharedHomeRepository: () => ({ list: mockList, subscribe: mockSubscribe }),
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useFocusEffect: (callback: () => void) =>
    require("react").useEffect(callback, [callback]),
}));
let change: (state: AppStateStatus) => void;
let invalidate: () => void;
let listener: jest.SpyInstance;
const note = { id: "note", body: "Private goal note" };
beforeEach(() => {
  AppState.currentState = "active";
  mockList.mockReset().mockResolvedValue([]);
  mockSubscribe.mockReset().mockImplementation((_user, callback) => {
    invalidate = callback;
    return jest.fn();
  });
  listener = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      change = callback;
      return { remove: jest.fn() };
    });
});
afterEach(() => {
  listener.mockRestore();
  jest.useRealTimers();
});
function repo(command = jest.fn().mockResolvedValue([note])) {
  return { command } as unknown as SharedLifeRepository;
}
function transition(state: AppStateStatus) {
  AppState.currentState = state;
  change?.(state);
}
it("hides source text while backgrounded and reloads authorization on resume", async () => {
  const command = jest.fn().mockResolvedValueOnce([note]).mockResolvedValue([]);
  const repository = repo(command);
  const { result, unmount } = renderHook(() =>
    useSharedLifeDeliveries("reader", repository),
  );
  await act(async () => {});
  expect(result.current.deliveries).toEqual([note]);
  act(() => transition("background"));
  expect(result.current.deliveries).toEqual([]);
  await act(async () => transition("active"));
  expect(result.current.deliveries).toEqual([]);
  unmount();
});
it("rejects a source response started before backgrounding", async () => {
  let finish!: (value: unknown) => void;
  const repository = repo(
    jest.fn().mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    ),
  );
  const { result, unmount } = renderHook(() =>
    useSharedLifeDeliveries("reader", repository),
  );
  act(() => transition("background"));
  await act(async () => finish([note]));
  expect(result.current.deliveries).toEqual([]);
  unmount();
});
it("refreshes source cards on realtime invalidation and polls goal notes", async () => {
  jest.useFakeTimers();
  const command = jest.fn().mockResolvedValue([note]);
  const repository = repo(command);
  const { result, unmount } = renderHook(() =>
    useSharedLifeDeliveries("reader", repository),
  );
  await act(async () => {});
  expect(mockSubscribe).toHaveBeenCalledWith("reader", expect.any(Function));
  command.mockResolvedValue([]);
  await act(async () => invalidate());
  expect(result.current.deliveries).toEqual([]);
  const calls = command.mock.calls.length;
  await act(async () => jest.advanceTimersByTime(30_000));
  expect(command.mock.calls.length).toBeGreaterThan(calls);
  unmount();
});
