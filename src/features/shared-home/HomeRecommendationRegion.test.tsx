import { fireEvent, render } from "@testing-library/react-native";
import {
  HomeRecommendations,
  HomeNextStepsPage,
} from "./HomeRecommendationRegion";
import {
  buildHomeRecommendations,
  normalizeHomeRecommendationPreferences,
  selectHomeRecommendations,
} from "./homeRecommendations";
jest.mock("./SharedLifePage", () => ({
  SharedLifePage: ({ children }: any) => children,
}));
jest.mock("../../ui/DropdownMenu", () => {
  const { View, Pressable, Text } = require("react-native");
  return {
    DropdownMenu: View,
    DropdownMenuTrigger: View,
    DropdownMenuContent: View,
    DropdownMenuItem: ({ label, onPress }: any) => (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
const preferences = normalizeHomeRecommendationPreferences(undefined);
const offers = buildHomeRecommendations(
  { access: "adult", household: "together", money: "unused", meals: "active" },
  preferences,
);
it("lets a user act on discovery while unfinished work is featured", () => {
  const onOpen = jest.fn();
  const dispatch = jest.fn();
  const ui = render(
    <HomeRecommendations
      {...selectHomeRecommendations(offers, preferences)}
      onOpen={onOpen}
      dispatch={dispatch}
      onOverview={jest.fn()}
    />,
  );
  fireEvent.press(ui.getByLabelText("Explore Money"));
  expect(onOpen).toHaveBeenCalledWith(
    expect.objectContaining({ id: "money", kind: "discover" }),
  );
  fireEvent.press(ui.getByText("Save for later"));
  expect(dispatch).toHaveBeenCalledWith({
    type: "offer",
    id: "meals",
    status: "later",
  });
});
it("restores a parked offer and unhides Home when the explicit action promises to show it", () => {
  const prefs = normalizeHomeRecommendationPreferences({
    hidden: true,
    offers: { meals: "later", money: "declined" },
  });
  const dispatch = jest.fn();
  const ui = render(
    <HomeNextStepsPage
      model={{
        offers,
        ...selectHomeRecommendations(offers, prefs),
        preferences: prefs,
        dispatch,
        eligible: true,
        loading: false,
        partialError: false,
        retry: jest.fn(),
      }}
      onOpen={jest.fn()}
      onClose={jest.fn()}
    />,
  );
  fireEvent.press(ui.getAllByText("Show this on Home")[0]);
  expect(dispatch).toHaveBeenCalledWith({ type: "hidden", value: false });
  expect(dispatch).toHaveBeenCalledWith({
    type: "offer",
    id: "meals",
    status: null,
  });
});
