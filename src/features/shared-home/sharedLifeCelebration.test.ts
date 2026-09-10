import { offerHomeMoment } from "./sharedLifeCelebration";
import { useCelebrationStore } from "../../store/useCelebrationStore";
import { useAppStore } from "../../store/useAppStore";
import { shareMomentInHome } from "./sharedLifeShareRequest";
jest.mock("../../store/useCelebrationStore", () => ({
  useCelebrationStore: { getState: () => ({ celebrate: mockCelebrate }) },
}));
jest.mock("../../store/useAppStore", () => ({
  useAppStore: { getState: jest.fn() },
}));
jest.mock("../household/sharedDevice/useHouseholdModeStore", () => ({
  useHouseholdModeStore: { getState: () => ({ session: null }) },
}));
jest.mock("./sharedLifeShareRequest", () => ({ shareMomentInHome: jest.fn() }));
const mockCelebrate = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useAppStore.getState)
    .mockReturnValue({ authIdentity: { userId: "a" } } as ReturnType<
      typeof useAppStore.getState
    >);
});
it("offers each completion without publishing and carries only a reviewed title", () => {
  const attachment = {
    kind: "goal_completed" as const,
    title: "Finish the garden",
  };
  offerHomeMoment("a", attachment, "goal-1:completed-at");
  offerHomeMoment(
    "a",
    { kind: "place", name: "Park", latitude: 40, longitude: -111 },
    "place-2",
  );
  expect(mockCelebrate).toHaveBeenCalledTimes(2);
  const moment = mockCelebrate.mock.calls[0][0];
  expect(moment).toMatchObject({
    priority: "high",
    autoDismissMs: 0,
    primaryAction: { label: "Share this moment" },
  });
  expect(shareMomentInHome).not.toHaveBeenCalled();
  moment.primaryAction.run();
  expect(shareMomentInHome).toHaveBeenCalledWith("a", attachment);
});
it("does not carry an old account moment into another account", () => {
  offerHomeMoment(
    "a",
    { kind: "goal_completed", title: "Finish the garden" },
    "completion",
  );
  jest
    .mocked(useAppStore.getState)
    .mockReturnValue({ authIdentity: { userId: "b" } } as ReturnType<
      typeof useAppStore.getState
    >);
  mockCelebrate.mock.calls[0][0].primaryAction.run();
  expect(shareMomentInHome).not.toHaveBeenCalled();
});
