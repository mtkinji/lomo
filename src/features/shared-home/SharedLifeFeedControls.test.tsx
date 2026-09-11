import { fireEvent, render } from "@testing-library/react-native";
import { SharedLifeShareButton } from "./SharedLifeFeedControls";

it("opens the composer directly from Share a moment", () => {
  const onChoose = jest.fn();
  const view = render(<SharedLifeShareButton onChoose={onChoose} />);
  fireEvent.press(view.getByLabelText("Share a moment"));
  expect(onChoose).toHaveBeenCalledWith("write");
});
