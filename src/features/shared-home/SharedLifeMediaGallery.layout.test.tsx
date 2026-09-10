import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { HomePhoto, HomeMediaSourceContext } from "./SharedLifeMediaGallery";
// Horizontal galleries use measured numeric width and height, without a competing ratio.
it("clears the fallback ratio when a measured gallery height arrives", () => {
  const pending = () => new Promise<never>(() => {});
  const view = render(
    <HomeMediaSourceContext.Provider value={pending}>
      <HomePhoto path="fixture" alt="Stream" />
    </HomeMediaSourceContext.Provider>,
  );
  const frame = () =>
    view
      .UNSAFE_getByType(HomePhoto)
      .findAllByType(require("react-native").View)[0];
  expect(StyleSheet.flatten(frame().props.style).aspectRatio).toBe(4 / 3);
  view.rerender(
    <HomeMediaSourceContext.Provider value={pending}>
      <HomePhoto path="fixture" alt="Stream" height={240} width={360} />
    </HomeMediaSourceContext.Provider>,
  );
  expect(StyleSheet.flatten(frame().props.style)).toMatchObject({
    width: 360,
    height: 240,
  });
  expect(StyleSheet.flatten(frame().props.style).aspectRatio).toBeUndefined();
});
