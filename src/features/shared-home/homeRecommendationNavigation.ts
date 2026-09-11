import type { HomeRecommendation } from "./homeRecommendations";
import type { RootDrawerParamList } from "../../navigation/RootNavigator";
type Target = {
  [K in "Settings" | "Money" | "Food"]: {
    name: K;
    params: RootDrawerParamList[K];
  };
}["Settings" | "Money" | "Food"];
export function homeRecommendationTarget(
  destination: HomeRecommendation["destination"],
): Target {
  switch (destination) {
    case "household":
      return { name: "Settings", params: { screen: "SettingsHousehold" } };
    case "money":
      return {
        name: "Money",
        params: {
          screen: "MoneyEntry",
          params: {
            requestedPlace: "MoneySummary",
            source: "direct",
            mode: "automatic",
          },
        },
      };
    case "recipes":
      return { name: "Food", params: { screen: "RecipeLibrary" } };
    case "meal-planning":
      return { name: "Food", params: { screen: "NextMeals" } };
  }
}
