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
  return { BottomDrawer: View, BottomDrawerScrollView: View };
});
jest.mock("../../ui/layout/BottomDrawerHeader", () => ({
  BottomDrawerHeader: () => null,
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
  fireEvent.press(view.getByText("Choose people"));
  fireEvent.press(view.getByText("Mina"));
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
