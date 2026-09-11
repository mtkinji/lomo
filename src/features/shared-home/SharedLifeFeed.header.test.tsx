// Native regression: a late recommendation must not be inserted above the viewport at scroll offset zero.
// The matching populated-feed scenario is exercised in HomeConnectedPreview on iOS.
import { render } from "@testing-library/react-native";
import { FlatList } from "react-native";
import { SharedLifeFeed } from "./SharedLifeFeed";
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useFocusEffect: () => undefined,
}));
jest.mock("../safety/UgcReportDrawer", () => ({ UgcReportDrawer: () => null }));
jest.mock("./useSharedLife", () => {
  const life = {
    posts: [],
    loading: false,
    error: null,
    more: false,
    filter: {},
    incoming: [],
    bootstrap: { households: [], people: [], householdChoices: [] },
    repository: {
      command: jest.fn().mockResolvedValue([]),
      cleanupMedia: jest.fn().mockResolvedValue(undefined),
    },
    refresh: jest.fn(),
    revalidate: jest.fn(),
    setFilter: jest.fn(),
  };
  return { useSharedLife: () => life };
});
jest.mock("./useSharedLifeDeliveries", () => ({
  useSharedLifeDeliveries: () => ({
    deliveries: [],
    deliveryError: false,
    refreshDeliveries: jest.fn(),
  }),
}));
jest.mock("./useHomeRecommendations", () => ({
  useHomeRecommendations: () => ({
    featured: null,
    complementary: null,
    eligible: false,
    dispatch: jest.fn(),
  }),
}));
jest.mock("./SharedLifeComposer", () => ({ SharedLifeComposer: () => null }));
jest.mock("../../ui/layout/CanvasFlatList", () => ({
  CanvasFlatListWithRef: require("react-native").FlatList,
}));
jest.mock("../../ui/KwiltRefresh", () => ({
  KwiltRefreshFrame: ({ children }: { children: React.ReactNode }) => children,
  useKwiltRefresh: () => ({ onScroll: jest.fn() }),
}));
it("reveals a newly loaded header at the top while preserving the native anchor further down", () => {
  const ui = render(<SharedLifeFeed userId="u" />);
  expect(
    ui.UNSAFE_getByType(FlatList).props.maintainVisibleContentPosition,
  ).toEqual({ minIndexForVisible: 0, autoscrollToTopThreshold: 0 });
});
it("keeps a late header visible until the person scrolls into the feed", () => {
  const { fireEvent } = require("@testing-library/react-native");
  const frame = jest
    .spyOn(global, "requestAnimationFrame")
    .mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  const scroll = jest
    .spyOn(FlatList.prototype, "scrollToOffset")
    .mockImplementation(() => undefined);
  const ui = render(<SharedLifeFeed userId="u" />);
  const header = ui.getByTestId("home.recommendationHeader");
  fireEvent(header, "layout", { nativeEvent: { layout: { height: 320 } } });
  expect(scroll).toHaveBeenCalledWith({ offset: 0, animated: false });
  scroll.mockClear();
  fireEvent(ui.getByTestId("home.sharedLife"), "scrollBeginDrag", {
    nativeEvent: { contentOffset: { y: 0 } },
  });
  fireEvent(ui.getByTestId("home.sharedLife"), "scrollEndDrag", {
    nativeEvent: { contentOffset: { y: 500 } },
  });
  fireEvent(header, "layout", { nativeEvent: { layout: { height: 360 } } });
  expect(scroll).not.toHaveBeenCalled();
  scroll.mockRestore();
  frame.mockRestore();
});
it("restores the top after backgrounding before a post anchor exists", () => {
  const { AppState } = require("react-native");
  const { fireEvent, act } = require("@testing-library/react-native");
  const listeners: Array<(state: string) => void> = [];
  const subscription = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, callback) => {
      listeners.push(callback as (state: string) => void);
      return { remove: jest.fn() };
    });
  const frame = jest
    .spyOn(global, "requestAnimationFrame")
    .mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  const scroll = jest
    .spyOn(FlatList.prototype, "scrollToOffset")
    .mockImplementation(() => undefined);
  const ui = render(<SharedLifeFeed userId="u" />);
  act(() => listeners.forEach((listener) => listener("inactive")));
  fireEvent(ui.getByTestId("home.recommendationHeader"), "layout", {
    nativeEvent: { layout: { height: 320 } },
  });
  fireEvent(ui.getByTestId("home.sharedLife"), "contentSizeChange", 402, 1200);
  expect(scroll).toHaveBeenCalledWith({ offset: 0, animated: false });
  scroll.mockRestore();
  frame.mockRestore();
  subscription.mockRestore();
});
