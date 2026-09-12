import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AppState, StyleSheet } from "react-native";
import { radii, spacing } from "../../theme";
import { SharedLifeConversation } from "./SharedLifeConversation";
import type { HomePost } from "./sharedLifeTypes";
import type { SharedLifeRepository } from "./sharedLifeRepository";

const mockBottomDrawerProps: any[] = [];
const mockDictationStart = jest.fn();
let mockDictationOptions: any;

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../../ui/BottomDrawer", () => {
  const React = require("react");
  const { View: MockView } = require("react-native");
  return {
    BottomDrawer: ({ children, bottomAccessory, ...props }: any) => {
      mockBottomDrawerProps.push(props);
      return React.createElement(
        MockView,
        { testID: "conversation.drawer" },
        children,
        bottomAccessory,
      );
    },
    BottomDrawerScrollView: ({ children, ...props }: any) =>
      React.createElement(MockView, props, children),
  };
});
jest.mock("./SharedLifePage", () => {
  const React = require("react");
  const { View: MockView } = require("react-native");
  return {
    SharedLifePage: ({ children, footer }: any) =>
      React.createElement(
        MockView,
        { testID: "conversation.page" },
        children,
        footer,
      ),
  };
});
jest.mock("./SharedLifeMediaGallery", () => ({ HomePhoto: () => null }));
jest.mock("../unifiedChat/useChatDictation", () => ({
  useChatDictation: (options: any) => {
    mockDictationOptions = options;
    return {
      start: mockDictationStart,
      stop: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
    };
  },
}));

const post = (replyCount: number): HomePost => ({
  id: "post",
  kind: "moment",
  authorId: "alex",
  authorName: "Alex",
  text: "We took the long way home.",
  media: [{ path: "moment.jpg", alt: "A creek beside the trail" }],
  audience: "household",
  householdId: "household",
  householdName: "Our household",
  attachment: null,
  createdAt: "2026-09-11T18:00:00.000Z",
  updatedAt: "2026-09-11T18:00:00.000Z",
  reactionCount: 2,
  replyCount,
  myReaction: null,
});

function repositoryFor(value: HomePost): SharedLifeRepository {
  return {
    conversation: jest.fn().mockResolvedValue({ post: value, replies: [] }),
    command: jest.fn().mockResolvedValue({}),
  } as unknown as SharedLifeRepository;
}

let previousAppState: typeof AppState.currentState;

beforeEach(() => {
  mockBottomDrawerProps.length = 0;
  mockDictationStart.mockClear();
  mockDictationOptions = undefined;
  previousAppState = AppState.currentState;
  AppState.currentState = "active";
});

afterEach(() => {
  AppState.currentState = previousAppState;
});

it("opens a short conversation at the medium detent and expands before composing", async () => {
  const shortPost = post(2);
  const view = render(
    <SharedLifeConversation
      post={shortPost}
      userId="reader"
      repository={repositoryFor(shortPost)}
      onReport={jest.fn()}
      onChanged={jest.fn()}
      onClose={jest.fn()}
    />,
  );

  await waitFor(() => expect(view.getByText(shortPost.text)).toBeTruthy());
  expect(view.getByTestId("conversation.drawer")).toBeTruthy();
  expect(view.queryByText("Replies stay with this moment.")).toBeNull();
  expect(view.getByLabelText("Your reply").props.accessibilityHint).toBe(
    "Visible to this post's audience",
  );
  expect(view.getByLabelText("Send reply")).toBeTruthy();
  expect(view.getByLabelText("Start voice input")).toBeTruthy();
  expect(
    StyleSheet.flatten(
      view.getByTestId("conversation.original-thumbnail").props.style,
    ),
  ).toMatchObject({
    borderRadius: radii.input,
    overflow: "hidden",
  });
  expect(
    StyleSheet.flatten(view.getByTestId("bottom-drawer.header").props.style)
      .paddingTop,
  ).toBe(spacing.md);
  expect(mockBottomDrawerProps.at(-1)).toMatchObject({
    snapPoints: ["62%", "100%"],
    snapIndex: 0,
    keyboardBehavior: "resize",
    enableContentPanningGesture: true,
  });
  expect(mockBottomDrawerProps.at(-1).bottomAccessoryShowTopBorder).toBeUndefined();

  fireEvent(view.getByLabelText("Your reply"), "focus");

  await waitFor(() => expect(mockBottomDrawerProps.at(-1).snapIndex).toBe(1));

  act(() => mockDictationOptions.onTranscript("spoken words", null));
  expect(view.getByLabelText("Your reply").props.value).toBe("spoken words");
});

it("opens a conversation with three or more replies fully expanded", async () => {
  const activePost = post(3);
  const view = render(
    <SharedLifeConversation
      post={activePost}
      userId="reader"
      repository={repositoryFor(activePost)}
      onReport={jest.fn()}
      onChanged={jest.fn()}
      onClose={jest.fn()}
    />,
  );

  await waitFor(() => expect(view.getByText(activePost.text)).toBeTruthy());
  expect(mockBottomDrawerProps.at(-1).snapIndex).toBe(1);
});

it("lets a drag settle the conversation back at the medium detent", async () => {
  const activePost = post(3);
  const view = render(
    <SharedLifeConversation
      post={activePost}
      userId="reader"
      repository={repositoryFor(activePost)}
      onReport={jest.fn()}
      onChanged={jest.fn()}
      onClose={jest.fn()}
    />,
  );

  await waitFor(() => expect(view.getByText(activePost.text)).toBeTruthy());
  act(() => {
    mockBottomDrawerProps.at(-1).onSnapIndexChange(0, {
      previousIndex: 1,
      direction: "down",
    });
  });
  expect(mockBottomDrawerProps.at(-1).snapIndex).toBe(0);
});
