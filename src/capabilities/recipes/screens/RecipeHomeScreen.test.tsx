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
import { deriveRecipeNextActions } from "../domain/recipeNextAction";

jest.mock("../../../features/unifiedChat/UnifiedChatDrawer", () => ({
  UnifiedChatDrawer: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const defaultRecipeHomeDockProps = {
  ...deriveRecipeNextActions({ activeCook: false, isInPlan: false, planState: null }),
  actionBusy: false,
  onDockAction: jest.fn(),
};

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
        message: "Hidden from your recipes",
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

  it('keeps contextual Chat in the Action Dock instead of crowding the object header', () => {
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={4}
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
        onMore={jest.fn()}
        onChat={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Chat about this meal')).toBeTruthy();
  });

  it("makes Meal Plan membership the next action and keeps recipe ingredients checkable", () => {
    const onDockAction = jest.fn();
    const actions = deriveRecipeNextActions({ activeCook: false, isInPlan: false, planState: null });
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={4}
        recommendedAction={actions.recommendedAction}
        menuActions={actions.menuActions}
        actionBusy={false}
        onServingsChange={jest.fn()}
        onDockAction={onDockAction}
        onMore={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByText("Add to Meal Plan"));
    expect(onDockAction).toHaveBeenCalledWith("add_to_plan", "primary");
    expect(screen.queryByTestId("recipe-plan-toggle")).toBeNull();
    expect(screen.getByText("What this recipe takes")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getByText("55 min")).toBeTruthy();
    expect(screen.getByText("Cake")).toBeTruthy();
    expect(screen.getByText("Glaze")).toBeTruthy();
    expect(screen.getByText("Instructions")).toBeTruthy();
    expect(screen.queryByText("Method")).toBeNull();
    expect(screen.getByText("Bake")).toBeTruthy();
    expect(screen.getByText("Finish")).toBeTruthy();
    expect(screen.getByText("¾ cup flour, sifted")).toBeTruthy();
    expect(screen.getByTestId("object-detail-media-hero")).toBeTruthy();
    expect(screen.getByTestId("object-detail-media-sheet")).toBeTruthy();
    expect(screen.getByLabelText("Recipe actions")).toBeTruthy();
    expect(screen.queryByText("More recipe actions")).toBeNull();
    expect(screen.queryByText("1 1/2 cups flour, sifted")).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(
      recipeVersionContractFixture().ingredients.length,
    );
  });

  it('places a relevant Kwilt equipment pick between ingredients and instructions', () => {
    const onOpenEditorialPick = jest.fn();
    const version = {
      ...recipeVersionContractFixture(),
      equipmentRequirements: [{
        id: 'food-processor',
        label: 'Food processor',
        searchQuery: 'food processor',
        necessity: 'required' as const,
        confidence: 0.97,
        evidenceText: 'Pulse the filling in a food processor.',
        substitute: null,
      }],
      instructions: [
        ...recipeVersionContractFixture().instructions,
        {
          id: 'step-processor',
          recipeVersionId: recipeVersionContractFixture().id,
          position: 2,
          sectionLabel: null,
          text: 'Pulse the filling in a food processor.',
        },
      ],
    };
    const screen = render(
      <RecipeHomeView
        projection={{ recipe: recipeContractFixture(), currentVersion: version }}
        servings={4}
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
        onMore={jest.fn()}
        onOpenEditorialPick={onOpenEditorialPick}
      />,
    );

    expect(screen.getByText('Tools')).toBeTruthy();
    expect(screen.getByText('KitchenAid 7-Cup Food Processor')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('View KitchenAid 7-Cup Food Processor on Amazon'));
    expect(onOpenEditorialPick).toHaveBeenCalledWith(expect.objectContaining({
      asin: 'B07BW1ZPB5',
    }));
  });

  it("offers contextual Meals at the bottom without inventing ratings", () => {
    const onOpenRecipe = jest.fn();
    const recommendedRecipe = {
      ...recipeContractFixture(),
      id: "recipe-2",
    };
    const recommendedVersion = {
      ...recipeVersionContractFixture(),
      id: "version-2",
      recipeId: "recipe-2",
      title: "Weeknight noodles",
    };
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        recommendations={[
          {
            projection: {
              recipe: recommendedRecipe,
              currentVersion: recommendedVersion,
            },
            reason: {
              id: "similar_ingredients",
              label: "Uses similar ingredients",
              icon: "layers",
            },
          },
        ]}
        servings={4}
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
        onMore={jest.fn()}
        onOpenRecipe={onOpenRecipe}
      />,
    );

    expect(screen.getByText("More recipes you might like")).toBeTruthy();
    expect(screen.getByText("Weeknight noodles")).toBeTruthy();
    expect(screen.getByText("Uses similar ingredients")).toBeTruthy();
    expect(screen.queryByText(/review/i)).toBeNull();
    fireEvent.press(
      screen.getByLabelText(
        "Open Weeknight noodles. Uses similar ingredients",
      ),
    );
    expect(onOpenRecipe).toHaveBeenCalledWith("recipe-2");
  });

  it("omits unknown effort facts instead of rendering placeholder dashes", () => {
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
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(screen.queryByText("—")).toBeNull();
    expect(screen.queryByText("Total")).toBeNull();
    expect(screen.queryByText("Prep")).toBeNull();
    expect(screen.queryByText("Cook")).toBeNull();
    expect(screen.getByText("Servings")).toBeTruthy();
    expect(screen.getByLabelText("8 servings")).toBeTruthy();
    expect(screen.queryByText("Makes")).toBeNull();
    expect(screen.queryByText("Scale recipe")).toBeNull();
    expect(screen.getByText("Private to you")).toBeTruthy();
    expect(screen.getByText(/Grandma Ruth's card/)).toBeTruthy();
  });

  it("adjusts servings from the integrated summary control", () => {
    const onServingsChange = jest.fn();
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={4}
        {...defaultRecipeHomeDockProps}
        onServingsChange={onServingsChange}
        onMore={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByLabelText("Decrease servings"));
    fireEvent.press(screen.getByLabelText("Increase servings"));

    expect(onServingsChange).toHaveBeenNthCalledWith(1, 3);
    expect(onServingsChange).toHaveBeenNthCalledWith(2, 5);
  });

  it("presents Kwilt editorial context as a meal story while preserving personal notes", () => {
    const personal = render(
      <RecipeHomeView
        projection={{
          recipe: recipeContractFixture(),
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={8}
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
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
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
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
        {...deriveRecipeNextActions({ activeCook: true, isInPlan: true, planState: "finalized" })}
        actionBusy={false}
        cookCount={3}
        priorLearning={{
          id: "record-1",
          sessionId: "session-1",
          recipeId: "recipe-1",
          recipeVersionId: "version-1",
          servingScale: 1,
          wouldMakeAgain: true,
          outcomeRating: 4,
          privateNote: "Use more sauce",
          substitutions: [{
            id: "substitution-1",
            ingredientLineId: "ingredient-1",
            ingredientText: "1 cup whole milk",
            usedInstead: "oat milk",
            resultRating: 3,
            note: "Use a little less",
          }],
          completedAt: "2026-08-05T12:00:00.000Z",
        }}
        onServingsChange={jest.fn()}
        onDockAction={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(screen.getByText("From your last cook")).toBeTruthy();
    expect(screen.getByText("Cooked 3 times")).toBeTruthy();
    expect(screen.getByText("You rated this cook 4 out of 5.")).toBeTruthy();
    expect(screen.getByText("Last time you used oat milk instead of 1 cup whole milk.")).toBeTruthy();
    expect(screen.getByText("That substitution was 3 out of 5 · Use a little less")).toBeTruthy();
    expect(screen.getByText("Use more sauce")).toBeTruthy();
    expect(screen.getByText(/Private Cook record/)).toBeTruthy();
    expect(screen.getByText("Continue cooking")).toBeTruthy();
  });

  it("uses a complete no-photo artwork state without missing-photo language", () => {
    const recipe = { ...recipeContractFixture(), mediaAssets: [] };
    const screen = render(
      <RecipeHomeView
        projection={{ recipe, currentVersion: recipeVersionContractFixture() }}
        servings={8}
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
        onMore={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Recipe artwork")).toBeTruthy();
    expect(screen.queryByText("Your recipe")).toBeNull();
    expect(screen.queryByText(/missing photo/i)).toBeNull();
  });

  it("pages all active Meal photos in the hero", () => {
    const recipe = recipeContractFixture();
    const first = recipe.mediaAssets[0];
    const screen = render(
      <RecipeHomeView
        projection={{
          recipe: {
            ...recipe,
            mediaAssets: [
              first,
              { ...first, id: "media-2", storageRef: "https://example.com/second.jpg" },
            ],
          },
          currentVersion: recipeVersionContractFixture(),
        }}
        servings={8}
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
        onMore={jest.fn()}
      />,
    );

    fireEvent(screen.getByTestId("recipe-home-gallery"), "layout", {
      nativeEvent: { layout: { width: 320, height: 320 } },
    });
    expect(screen.getByText("1 / 2", { includeHiddenElements: true })).toBeTruthy();
  });

  it("uses truthful empty Instructions copy", () => {
    const version = { ...recipeVersionContractFixture(), instructions: [] };
    const screen = render(
      <RecipeHomeView
        projection={{ recipe: recipeContractFixture(), currentVersion: version }}
        servings={8}
        {...defaultRecipeHomeDockProps}
        onServingsChange={jest.fn()}
        onMore={jest.fn()}
      />,
    );

    expect(screen.getByText("No instructions added yet.")).toBeTruthy();
  });
});
