import { fireEvent, render } from "@testing-library/react-native";
import {
  recipeContractFixture,
  recipeVersionContractFixture,
} from "../domain/recipeContractFixtures";
import {
  hideCatalogMeal,
  RecipeHeaderActions,
  RecipeHomeView,
} from "./RecipeHomeScreen";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("Recipe Home", () => {
  it("hides a catalog meal, returns to Meals, and makes Undo restore server state", async () => {
    const setHidden = jest.fn().mockResolvedValue(undefined);
    const onHidden = jest.fn();
    const onError = jest.fn();
    const showToast = jest.fn();

    await hideCatalogMeal({
      recipeId: "meal-1",
      setHidden,
      onHidden,
      onError,
      showToast,
    });

    expect(setHidden).toHaveBeenCalledWith("meal-1", true);
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Hidden from your Meals",
        actionLabel: "Undo",
      }),
    );
    await showToast.mock.calls[0][0].actionOnPress();
    expect(setHidden).toHaveBeenLastCalledWith("meal-1", false);
  });

  it("keeps the meal visible and contains the error when persistence fails", async () => {
    const setHidden = jest.fn().mockRejectedValue(new Error("offline"));
    const onHidden = jest.fn();
    const onError = jest.fn();
    const showToast = jest.fn();

    await hideCatalogMeal({
      recipeId: "meal-1",
      setHidden,
      onHidden,
      onError,
      showToast,
    });

    expect(onHidden).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(new Error("offline"));
  });

  it("puts a coherent like and not-for-us pair directly in the object header", () => {
    const onFavorite = jest.fn();
    const onHide = jest.fn();
    const onShare = jest.fn();
    const screen = render(
      <RecipeHeaderActions
        isFavorite={false}
        favoriteBusy={false}
        hideAvailable
        onToggleFavorite={onFavorite}
        onHide={onHide}
        onShare={onShare}
      />,
    );

    expect(
      screen
        .getAllByRole("button")
        .map((button) => button.props.accessibilityLabel),
    ).toEqual([
      "Share recipe",
      "Not for us — hide this meal",
      "Like this meal",
    ]);
    fireEvent.press(screen.getByLabelText("Share recipe"));
    fireEvent.press(screen.getByLabelText("Like this meal"));
    fireEvent.press(screen.getByLabelText("Not for us — hide this meal"));
    expect(onFavorite).toHaveBeenCalledTimes(1);
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("keeps cooking dominant in the floating dock and makes plan membership a direct companion action", () => {
    const onTogglePlan = jest.fn();
    const onCook = jest.fn();
    const onToggle = jest.fn();
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={4}
        checked={new Set()}
        isInPlan={false}
        planBusy={false}
        cookActionLabel="Start cooking"
        onServingsChange={jest.fn()}
        onToggleIngredient={onToggle}
        onTogglePlan={onTogglePlan}
        onCook={onCook}
        onMore={jest.fn()}
      />,
    );
    expect(screen.queryByText("Add to Meal Plan")).toBeNull();
    fireEvent.press(screen.getByLabelText("Add this meal to the Plan"));
    fireEvent.press(screen.getByText("Start cooking"));
    expect(onTogglePlan).toHaveBeenCalled();
    expect(onCook).toHaveBeenCalled();
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getByText("55 min")).toBeTruthy();
    expect(screen.getByText("Cake")).toBeTruthy();
    expect(screen.getByText("Glaze")).toBeTruthy();
    expect(screen.getByText("Bake")).toBeTruthy();
    expect(screen.getByText("Finish")).toBeTruthy();
    expect(screen.getByText("¾ cup flour, sifted")).toBeTruthy();
    expect(screen.queryByText("1 1/2 cups flour, sifted")).toBeNull();
    fireEvent.press(screen.getByText("¾ cup flour, sifted"));
    expect(onToggle).toHaveBeenCalledWith("ingredient-1");
  });

  it("shows provenance and missing-time treatment without turning it into an audit log", () => {
    const version = {
      ...recipeVersionContractFixture(),
      prepMinutes: null,
      cookMinutes: null,
    };
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: version,
        }}
        servings={8}
        checked={new Set()}
        isInPlan={false}
        planBusy={false}
        cookActionLabel="Start cooking"
        onServingsChange={jest.fn()}
        onToggleIngredient={jest.fn()}
        onTogglePlan={jest.fn()}
        onCook={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getByText("Private to you")).toBeTruthy();
    expect(screen.getByText(/Grandma Ruth's card/)).toBeTruthy();
  });

  it("presents Kwilt editorial context as a meal story while preserving personal notes", () => {
    const personal = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={8}
        checked={new Set()}
        isInPlan={false}
        planBusy={false}
        cookActionLabel="Start cooking"
        onServingsChange={jest.fn()}
        onToggleIngredient={jest.fn()}
        onTogglePlan={jest.fn()}
        onCook={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(personal.getByText("Notes")).toBeTruthy();
    expect(personal.queryByText("About this meal")).toBeNull();

    const starterRecipe = {
      ...recipeContractFixture(),
      provenance: {
        ...recipeContractFixture().provenance,
        rightsBasis: "kwilt_authored" as const,
      },
    };
    const editorial = render(
      <RecipeHomeView
        projection={{
          recipe: starterRecipe,
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={8}
        checked={new Set()}
        isInPlan={false}
        planBusy={false}
        cookActionLabel="Start cooking"
        onServingsChange={jest.fn()}
        onToggleIngredient={jest.fn()}
        onTogglePlan={jest.fn()}
        onCook={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(editorial.getByText("About this meal")).toBeTruthy();
    expect(editorial.queryByText("Notes")).toBeNull();
  });

  it("surfaces relevant private learning with its Cook-record source", () => {
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={8}
        checked={new Set()}
        isInPlan
        planBusy={false}
        cookActionLabel="Continue cooking"
        priorLearning={{
          id: "record-1",
          sessionId: "session-1",
          recipeId: "recipe-1",
          recipeVersionId: "version-1",
          servingScale: 1,
          wouldMakeAgain: true,
          privateNote: "Use more sauce",
          completedAt: "2026-08-05T12:00:00.000Z",
        }}
        onServingsChange={jest.fn()}
        onToggleIngredient={jest.fn()}
        onTogglePlan={jest.fn()}
        onCook={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(screen.getByText("From your last cook")).toBeTruthy();
    expect(screen.getByText("Use more sauce")).toBeTruthy();
    expect(screen.getByText(/Private Cook record/)).toBeTruthy();
    expect(screen.getByText("Continue cooking")).toBeTruthy();
    expect(screen.getByLabelText("Remove this meal from the Plan")).toBeTruthy();
  });
});
