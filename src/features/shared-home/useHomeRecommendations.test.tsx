import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useHomeRecommendations } from "./useHomeRecommendations";
import { useHomeRecommendationPreferences } from "./useHomeRecommendationPreferences";
let mockUser = "u";
let mockMode: unknown = null;
let mockChild: unknown = null;
const mockHousehold = jest.fn();
const mockMoney = jest.fn();
const mockMeals = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => unknown) => {
    require("react").useEffect(callback, [callback]);
  },
}));
jest.mock("../../store/useAppStore", () => ({
  useAppStore: (select: (state: { authIdentity: { userId: string } }) => unknown) =>
    select({ authIdentity: { userId: mockUser } }),
}));
jest.mock("../household/sharedDevice/useHouseholdModeStore", () => ({
  useHouseholdModeStore: (select: (state: { session: unknown }) => unknown) =>
    select({ session: mockMode }),
}));
jest.mock("../household/personalDevice/useManagedChildAccessStore", () => ({
  useManagedChildAccessStore: (select: (state: { access: unknown; hydrated: boolean }) => unknown) =>
    select({ access: mockChild, hydrated: true }),
}));
jest.mock("../../services/backend/supabaseClient", () => ({
  getSupabaseClient: () => ({}),
}));
jest.mock("../household/data/householdActionBoundary", () => ({
  createHouseholdActionBoundary: () => ({ read: mockHousehold }),
}));
jest.mock("../../capabilities/money/data/livingPlanRepository", () => ({
  getLivingPlanSettings: () => Promise.resolve({ active: null, target: null }),
}));
jest.mock("../../capabilities/money/runtime/moneyOnboardingStorage", () => ({
  loadMoneyOnboardingState: (...args: unknown[]) => mockMoney(...args),
}));
jest.mock(
  "../../capabilities/meal-planning/data/mealPlanningRepository",
  () => ({ createMealPlanningRepository: () => ({ list: mockMeals }) }),
);
beforeEach(() => {
  mockUser = "u";
  mockMode = null;
  mockChild = null;
  mockHousehold.mockReset().mockResolvedValue({
    household: null,
    currentMembershipId: null,
    members: [],
  });
  mockMoney
    .mockReset()
    .mockResolvedValue({ checkpoint: null, completedAt: null });
  mockMeals.mockReset().mockResolvedValue([]);
  useHomeRecommendationPreferences.setState({ byUserId: {}, hydrated: true });
});
it("exposes independent discovery and owner-reported continuation", async () => {
  mockMeals.mockResolvedValue([
    { state: "draft", candidates: [{ lifecycle: "idea" }] },
  ]);
  const { result } = renderHook(() => useHomeRecommendations("u", true));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.featured?.id).toBe("meals");
  expect(result.current.complementary?.kind).toBe("discover");
});
it("suppresses private reads and offers in previews, household mode and managed child access", async () => {
  const { result, rerender } = renderHook<
    ReturnType<typeof useHomeRecommendations>,
    { enabled: boolean }
  >(({ enabled }) => useHomeRecommendations("u", enabled), {
    initialProps: { enabled: false },
  });
  expect(mockHousehold).not.toHaveBeenCalled();
  mockMode = {};
  rerender({ enabled: true });
  mockMode = null;
  mockChild = {};
  rerender({ enabled: true });
  expect(mockHousehold).not.toHaveBeenCalled();
  expect(result.current.featured).toBeNull();
});
it("drops an in-flight response on account change and refuses stale actions", async () => {
  let resolve!: (v: unknown) => void;
  mockMoney.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const { result, rerender } = renderHook(() =>
    useHomeRecommendations("u", true),
  );
  await waitFor(() => expect(mockMoney).toHaveBeenCalled());
  const staleDispatch = result.current.dispatch;
  mockUser = "other";
  rerender({});
  await act(async () => resolve({ checkpoint: "account" }));
  expect(result.current.featured).toBeNull();
  act(() => staleDispatch({ type: "hidden", value: true }));
  expect(useHomeRecommendationPreferences.getState().byUserId).toEqual({});
});
it("lets an explicit retry recover unknown owner evidence", async () => {
  mockMoney.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(() => useHomeRecommendations("u", true));
  await waitFor(() => expect(result.current.partialError).toBe(true));
  expect(result.current.offers.some((o) => o.id === "money")).toBe(false);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.partialError).toBe(false);
  expect(result.current.offers.some((o) => o.id === "money")).toBe(true);
});
