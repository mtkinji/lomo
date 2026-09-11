import { homeRecommendationTarget } from "./homeRecommendationNavigation";
it("opens Household settings without creating or sending an invitation", () => {
  expect(homeRecommendationTarget("household")).toEqual({
    name: "Settings",
    params: { screen: "SettingsHousehold" },
  });
});
it("uses real automatic Money entry and native meal surfaces without rehearsal flags", () => {
  expect(homeRecommendationTarget("money")).toEqual({
    name: "Money",
    params: {
      screen: "MoneyEntry",
      params: {
        requestedPlace: "MoneySummary",
        source: "direct",
        mode: "automatic",
      },
    },
  });
  expect(homeRecommendationTarget("recipes")).toEqual({
    name: "Food",
    params: { screen: "RecipeLibrary" },
  });
  expect(homeRecommendationTarget("meal-planning")).toEqual({
    name: "Food",
    params: { screen: "NextMeals" },
  });
});
