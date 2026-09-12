import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import { AppState, TextInput } from "react-native";
import { SharedLifeConversation } from "./SharedLifeConversation";
import { SharedLifeAppreciation } from "./SharedLifeAppreciation";
import type { HomePost } from "./sharedLifeTypes";
import type { SharedLifeRepository } from "./sharedLifeRepository";
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("./SharedLifePage", () => ({
  SharedLifePage: ({ children, footer }: any) => (
    <>
      {children}
      {footer}
    </>
  ),
}));
jest.mock("../../ui/BottomDrawer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BottomDrawer: ({ children, bottomAccessory }: any) => (
      <View>
        {children}
        {bottomAccessory}
      </View>
    ),
    BottomDrawerScrollView: ({ children }: any) => <View>{children}</View>,
  };
});
jest.mock("./SharedLifeMediaGallery", () => ({ HomePhoto: () => null }));
const post = {
  id: "post",
  kind: "moment",
  authorId: "author",
  authorName: "Private author",
  text: "Protected words",
  media: [],
  audience: "household",
  householdName: "Household",
} as unknown as HomePost;
let change: (state: any) => void;
let previous: typeof AppState.currentState;
beforeEach(() => {
  previous = AppState.currentState;
  AppState.currentState = "active";
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, cb) => {
    change = (state) => {
      AppState.currentState = state;
      cb(state);
    };
    return { remove: jest.fn() };
  });
});
afterEach(() => {
  AppState.currentState = previous;
  jest.restoreAllMocks();
});
it("does not restore a conversation from a late mutation refresh after backgrounding", async () => {
  let finish!: (value: unknown) => void;
  const conversation = jest
    .fn()
    .mockResolvedValueOnce({ post, replies: [] })
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    );
  const repository = {
    conversation,
    command: jest.fn().mockResolvedValue({}),
  } as unknown as SharedLifeRepository;
  const view = render(
    <SharedLifeConversation
      post={post}
      userId="reader"
      repository={repository}
      onReport={jest.fn()}
      onChanged={jest.fn()}
      onClose={jest.fn()}
    />,
  );
  await waitFor(() => expect(view.getByText("Protected words")).toBeTruthy());
  fireEvent.changeText(view.UNSAFE_getByType(TextInput), "Thank you");
  await act(async () => fireEvent.press(view.getByLabelText("Send reply")));
  act(() => change("background"));
  await act(async () => finish({ post, replies: [] }));
  expect(view.queryByText("Protected words")).toBeNull();
  view.unmount();
});
it("does not restore responder identities after backgrounding", async () => {
  let finish!: (value: unknown) => void;
  const repository = {
    command: jest.fn(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    ),
  } as unknown as SharedLifeRepository;
  const view = render(
    <SharedLifeAppreciation
      postId="post"
      repository={repository}
      onClose={jest.fn()}
    />,
  );
  act(() => change("background"));
  await act(async () => finish([{ id: "secret", name: "Private responder" }]));
  expect(view.queryByText("Private responder")).toBeNull();
  view.unmount();
});
