import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useMomentSuggestions } from "./useMomentSuggestions";
let mockUser = "u";
let mockHousehold: unknown = null;
const mockRecent = jest.fn();
const mockRecipes = jest.fn();
jest.mock("../../store/useAppStore", () => ({
  useAppStore: (
    select: (state: {
      authIdentity: { userId: string };
      domainHydrated: boolean;
      goals: unknown[];
    }) => unknown,
  ) =>
    select({
      authIdentity: { userId: mockUser },
      domainHydrated: true,
      goals: [],
    }),
}));
jest.mock("../household/sharedDevice/useHouseholdModeStore", () => ({
  useHouseholdModeStore: (select: (state: { session: unknown }) => unknown) =>
    select({ session: mockHousehold }),
}));
jest.mock("../../capabilities/explore/runtime/useExploreStore", () => ({
  useExploreStore: (
    select: (state: {
      places: Record<string, unknown>;
      placeRelationships: Record<string, unknown>;
    }) => unknown,
  ) => select({ places: {}, placeRelationships: {} }),
}));
jest.mock("../../capabilities/recipes/data/recipeCookRepository", () => ({
  createRecipeCookRepository: () => ({ listRecent: mockRecent }),
}));
jest.mock("../../capabilities/recipes/data/recipeRepository", () => ({
  createRecipeRepository: () => ({ list: mockRecipes }),
}));
beforeEach(() => {
  mockUser = "u";
  mockHousehold = null;
  mockRecent.mockReset();
  mockRecipes.mockReset();
});
it("resolves cooked meals from real records and recipe titles", async () => {
  mockRecent.mockResolvedValue([
    {
      id: "cook",
      recipeId: "r",
      completedAt: new Date().toISOString(),
      privateNote: "never share",
    },
  ]);
  mockRecipes.mockResolvedValue([
    {
      recipe: { id: "r", mediaAssets: [] },
      currentVersion: { title: "Tacos" },
    },
  ]);
  const { result } = renderHook(() => useMomentSuggestions("u"));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.suggestions[0]).toMatchObject({
    kind: "meal",
    title: "Tacos",
    text: "Made Tacos.",
  });
  expect(JSON.stringify(result.current.suggestions)).not.toContain(
    "never share",
  );
});
it("keeps failed sources retryable", async () => {
  mockRecent
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce([]);
  const { result } = renderHook(() => useMomentSuggestions("u"));
  await waitFor(() => expect(result.current.error).toBe(true));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.error).toBe(false));
});
it("drops pending results on account switch and household mode", async () => {
  let resolve!: (
    value: Array<{ id: string; recipeId: string; completedAt: string }>,
  ) => void;
  mockRecent.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  mockRecipes.mockResolvedValue([
    {
      recipe: { id: "r", mediaAssets: [] },
      currentVersion: { title: "Private" },
    },
  ]);
  const { result, rerender } = renderHook(() => useMomentSuggestions("u"));
  mockUser = "other";
  rerender({});
  await act(async () =>
    resolve([
      { id: "c", recipeId: "r", completedAt: new Date().toISOString() },
    ]),
  );
  expect(result.current.suggestions).toEqual([]);
  mockUser = "u";
  mockHousehold = { id: "h" };
  rerender({});
  expect(result.current.suggestions).toEqual([]);
});
