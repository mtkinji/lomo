// Callback wiring is isolated from native menu measurement; menu opening is exercised in Simulator.
jest.mock("../../ui/DropdownMenu", () => {
  const { View, Text, Pressable } = require("react-native");
  return {
    DropdownMenu: View,
    DropdownMenuTrigger: View,
    DropdownMenuContent: View,
    DropdownMenuItem: ({
      label,
      onPress,
    }: {
      label: string;
      onPress: () => void;
    }) => (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
import { PortalHost } from "../../ui/Portal";
import { render, fireEvent } from "@testing-library/react-native";
import { DeliveryCard } from "./SharedHomeDeliveryCard";
import { homeFeedItemExamples } from "../dev/homeFeedItemExamples";
const sample = homeFeedItemExamples.find(
  (e) => e.id === "goal-invitation-pending",
)!.delivery!;
it("keeps report in the menu and preserves source action routing", () => {
  const onOpen = jest.fn(),
    onReport = jest.fn();
  const v = render(
    <>
      <PortalHost />
      <DeliveryCard
        delivery={sample}
        now={new Date()}
        onOpen={onOpen}
        onReport={onReport}
      />
    </>,
  );
  fireEvent.press(v.getByText("Review invitation"));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(v.getByLabelText("Options for David's item")).toBeTruthy();
  expect(onReport).not.toHaveBeenCalled();
  fireEvent.press(v.getByText("Report"));
  expect(onReport).toHaveBeenCalledTimes(1);
});
it("shows a truthful closed state without a participation action", () => {
  const v = render(
    <>
      <PortalHost />
      <DeliveryCard
        delivery={{ ...sample, state: "settled", settledReason: "declined" }}
        now={new Date()}
        onOpen={jest.fn()}
      />
    </>,
  );
  expect(v.getByText("Invitation declined")).toBeTruthy();
  expect(v.queryByText("Review invitation")).toBeNull();
});
