jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
import { Alert } from "react-native";
import { act, render, fireEvent, waitFor } from "@testing-library/react-native";
import { SharedLifeComposer } from "./SharedLifeComposer";
import type { SharedLifeRepository } from "./sharedLifeRepository";
jest.mock("../../ui/BottomDrawer", () => {
  const { View } = require("react-native");
  const {
    BottomDrawerSemanticFooter,
  } = require("../../ui/layout/BottomDrawerSemanticFooter");
  return {
    BottomDrawer: ({ children, footer }: any) => (
      <View>
        {children}
        {footer ? <BottomDrawerSemanticFooter {...footer} /> : null}
      </View>
    ),
    BottomDrawerScrollView: View,
  };
});
jest.mock("../../ui/layout/BottomDrawerHeader", () => ({
  BottomDrawerHeader: () => null,
}));
const mockSuggestions = [
  {
    id: "goal:g",
    kind: "goal",
    title: "Finish the garden",
    context: "Completed goal",
    attachment: { kind: "goal_completed", title: "Finish the garden" },
    text: "",
    at: 0,
  },
];
jest.mock("./useMomentSuggestions", () => ({
  useMomentSuggestions: () => ({
    suggestions: mockSuggestions,
    loading: false,
    error: false,
    retry: jest.fn(),
  }),
}));
jest.mock("./sharedLifeDrafts", () => ({
  loadPendingHomeMoments: jest.fn().mockResolvedValue([]),
  savePendingHomeMoments: jest.fn().mockResolvedValue(undefined),
  loadHomeDraft: jest.fn().mockResolvedValue(null),
  saveHomeDraft: jest.fn().mockResolvedValue(undefined),
  removeHomeDraftPhotos: jest.fn(),
}));
it("renders household and selected-person labels as native text", async () => {
  const view = render(
    <SharedLifeComposer
      userId="user"
      bootstrap={{
        households: [{ id: "house", name: "Our family" }],
        people: [{ id: "person", name: "Mina" }],
        householdChoices: [],
      }}
      repository={{} as SharedLifeRepository}
      onClose={jest.fn()}
      onPublished={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(view.getByLabelText("Audience: Our family")).toBeTruthy(),
  );
  fireEvent.press(view.getByLabelText("Audience: Our family"));
  await act(async () => {
    fireEvent.press(view.getByText("Choose people"));
  });
  await act(async () => {
    fireEvent.press(view.getByText("Mina"));
  });
  expect(view.getByText("Mina ✓")).toBeTruthy();
});
it("keeps the offered goal ready after discarding an older draft", async () => {
  const { loadHomeDraft } = require("./sharedLifeDrafts");
  loadHomeDraft.mockResolvedValueOnce({
    id: "old",
    text: "Older thought",
    audience: "household",
    householdId: "house",
    recipientIds: [],
    photos: [],
    attachment: null,
  });
  const onClose = jest.fn();
  const view = render(
    <SharedLifeComposer
      userId="user"
      bootstrap={{
        households: [{ id: "house", name: "Our family" }],
        people: [],
        householdChoices: [],
      }}
      repository={
        {
          command: jest.fn().mockResolvedValue({}),
          cleanupMedia: jest.fn().mockResolvedValue(undefined),
        } as unknown as SharedLifeRepository
      }
      attachment={{ kind: "goal_completed", title: "Finish the garden" }}
      onClose={onClose}
      onPublished={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(view.getByDisplayValue("Older thought")).toBeTruthy(),
  );
  fireEvent.press(view.getByLabelText("Draft options"));
  const confirmation = jest.spyOn(Alert, "alert");
  fireEvent.press(view.getByText("Discard draft"));
  expect(confirmation).toHaveBeenCalled();
  await act(async () => {
    confirmation.mock.calls
      .at(-1)?.[2]
      ?.find((b) => b.text === "Discard draft")
      ?.onPress?.();
  });
  confirmation.mockRestore();
  await waitFor(() => expect(view.getByText("Finish the garden")).toBeTruthy());
  expect(onClose).not.toHaveBeenCalled();
});

jest.mock("./sharedLifePublishing", () => ({
  publishHomeDraft: jest.fn().mockResolvedValue("post"),
}));
it("posts a restored photo draft without requiring a separate description", async () => {
  const { loadHomeDraft, saveHomeDraft } = require("./sharedLifeDrafts");
  const { publishHomeDraft } = require("./sharedLifePublishing");
  const draft = {
    id: "birthday",
    text: "First birthday cake!",
    audience: "household",
    householdId: "house",
    recipientIds: [],
    attachment: null,
    photos: [{ id: "cake", uri: "file:///cake.jpg", alt: "" }],
  };
  loadHomeDraft.mockResolvedValueOnce(draft);
  const onPublished = jest.fn();
  const view = render(
    <SharedLifeComposer
      userId="user"
      bootstrap={{
        households: [{ id: "house", name: "Our family" }],
        people: [],
        householdChoices: [],
      }}
      repository={{ command: jest.fn() } as unknown as SharedLifeRepository}
      onClose={jest.fn()}
      onPublished={onPublished}
    />,
  );
  await waitFor(() => expect(view.getByDisplayValue(draft.text)).toBeTruthy());
  fireEvent.press(view.getByRole("button", { name: "Post to Our family" }));
  await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
  expect(publishHomeDraft).toHaveBeenCalledWith(
    draft,
    "user",
    expect.any(Object),
    expect.any(Function),
  );
  expect(saveHomeDraft).toHaveBeenCalledWith("user", null);
  expect(
    view.queryByText("Add a short description for each photo."),
  ).toBeNull();
});

it("keeps a failed photo draft and lets the same post be retried", async () => {
  const { loadHomeDraft } = require("./sharedLifeDrafts");
  const { publishHomeDraft } = require("./sharedLifePublishing");
  publishHomeDraft.mockRejectedValueOnce(
    new Error("Photo upload failed. Your draft is saved; try again."),
  );
  loadHomeDraft.mockResolvedValueOnce({
    id: "retry",
    text: "A little moment",
    audience: "household",
    householdId: "house",
    recipientIds: [],
    photos: [{ id: "photo", uri: "local", alt: "" }],
    attachment: null,
  });
  const onPublished = jest.fn();
  const view = render(
    <SharedLifeComposer
      userId="user"
      bootstrap={{
        households: [{ id: "house", name: "Our family" }],
        people: [],
        householdChoices: [],
      }}
      repository={{ command: jest.fn() } as unknown as SharedLifeRepository}
      onClose={jest.fn()}
      onPublished={onPublished}
    />,
  );
  await waitFor(() =>
    expect(view.getByDisplayValue("A little moment")).toBeTruthy(),
  );
  fireEvent.press(view.getByRole("button", { name: "Post to Our family" }));
  await waitFor(() =>
    expect(view.getByRole("alert")).toHaveTextContent(/Photo upload failed/),
  );
  expect(onPublished).not.toHaveBeenCalled();
  expect(view.getByDisplayValue("A little moment")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Post to Our family" }));
  await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1));
  expect(publishHomeDraft.mock.calls.at(-1)[0].id).toBe("retry");
});

it("uses the standard task drawer and keyboard-aware footer", async () => {
  const { BottomDrawer } = require("../../ui/BottomDrawer");
  const view = render(
    <SharedLifeComposer
      userId="user"
      intent="write"
      bootstrap={{
        households: [{ id: "house", name: "Our family" }],
        people: [],
        householdChoices: [],
      }}
      repository={{} as SharedLifeRepository}
      onClose={jest.fn()}
      onPublished={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(view.getByLabelText("Audience: Our family")).toBeTruthy(),
  );
  const page = view.UNSAFE_getByType(BottomDrawer);
  expect(page.props.footer.primaryAction.label).toBe("Post");
  expect(page.props.keyboardBehavior).toBe("resize");
  expect(
    view.queryByPlaceholderText("What would you like to share?"),
  ).toBeNull();
  expect(view.getByText("Start with a recent moment")).toBeTruthy();
  expect(
    view.getByRole("button", { name: "Post to Our family" }),
  ).toBeDisabled();
});

it("prepares a suggested moment without posting and preserves it when writing", async () => {
  const { publishHomeDraft } = require("./sharedLifePublishing");
  publishHomeDraft.mockClear();
  const view = render(
    <SharedLifeComposer
      userId="user"
      bootstrap={{
        households: [{ id: "h", name: "Family" }],
        people: [],
        householdChoices: [],
      }}
      repository={{} as SharedLifeRepository}
      onClose={jest.fn()}
      onPublished={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(view.getByText("Start with a recent moment")).toBeTruthy(),
  );
  await act(async () => {
    fireEvent.press(view.getByRole("button", { name: "Finish the garden" }));
  });
  expect(
    view.getByPlaceholderText("What would you like to share?"),
  ).toBeTruthy();
  expect(view.getByText("Finish the garden")).toBeTruthy();
  expect(publishHomeDraft).not.toHaveBeenCalled();
  expect(
    view.getByRole("button", { name: "Post to Family" }),
  ).not.toBeDisabled();
});
