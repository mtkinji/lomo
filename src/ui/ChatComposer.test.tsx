import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { radii } from "../theme";
import { ChatComposer } from "./ChatComposer";

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

it("uses the compact Chat pill at rest and expands the same surface on focus", () => {
  const view = render(
    <ChatComposer
      testID="composer"
      accessibilityLabel="Message"
      placeholder="Write a message…"
      value=""
      onChangeText={jest.fn()}
      onSend={jest.fn()}
    />,
  );

  expect(
    StyleSheet.flatten(view.getByTestId("composer.surface").props.style)
      .borderRadius,
  ).toBe(radii.pill);
  expect(
    StyleSheet.flatten(view.getByTestId("composer.prompt-row").props.style).flex,
  ).toBe(1);
  expect(
    StyleSheet.flatten(view.getByTestId("composer.toolbar").props.style)
      .flexShrink,
  ).toBe(0);
  expect(
    StyleSheet.flatten(view.getByTestId("composer.tool-well").props.style).flex,
  ).toBe(0);

  fireEvent(view.getByLabelText("Message"), "focus", {
    nativeEvent: {},
  });

  expect(
    StyleSheet.flatten(view.getByTestId("composer.surface").props.style)
      .borderRadius,
  ).toBe(radii.composer);
});

it("grows the prompt in place and sends from the internal Chat action", () => {
  const onSend = jest.fn();
  const view = render(
    <ChatComposer
      accessibilityLabel="Your reply"
      sendAccessibilityLabel="Send reply"
      placeholder="Write a reply…"
      value="One\nTwo\nThree"
      onChangeText={jest.fn()}
      onSend={onSend}
    />,
  );

  fireEvent(view.getByLabelText("Your reply"), "contentSizeChange", {
    nativeEvent: { contentSize: { height: 72, width: 240 } },
  });
  expect(
    StyleSheet.flatten(view.getByLabelText("Your reply").props.style).minHeight,
  ).toBe(72);
  fireEvent.press(view.getByLabelText("Send reply"));
  expect(onSend).toHaveBeenCalledTimes(1);
});

it("uses the standard microphone action for speech-to-text lifecycle", () => {
  const onStart = jest.fn();
  const onStop = jest.fn();
  const onCancel = jest.fn();
  const { getByLabelText, rerender } = render(
    <ChatComposer
      accessibilityLabel="Your reply"
      placeholder="Write a reply…"
      value="Draft"
      onChangeText={jest.fn()}
      onSend={jest.fn()}
      dictation={{
        state: "idle",
        elapsedSeconds: 0,
        levels: [],
        onStart,
        onStop,
        onCancel,
        onRetry: jest.fn(),
      }}
    />,
  );

  fireEvent(getByLabelText("Your reply"), "selectionChange", {
    nativeEvent: { selection: { start: 2, end: 2 } },
  });
  fireEvent.press(getByLabelText("Start voice input"));
  expect(onStart).toHaveBeenCalledWith({
    prompt: "Draft",
    selectionStart: 2,
    selectionEnd: 2,
  });

  rerender(
    <ChatComposer
      accessibilityLabel="Your reply"
      placeholder="Write a reply…"
      value="Draft"
      onChangeText={jest.fn()}
      onSend={jest.fn()}
      dictation={{
        state: "recording",
        elapsedSeconds: 4,
        levels: [0.2, 0.8],
        onStart,
        onStop,
        onCancel,
        onRetry: jest.fn(),
      }}
    />,
  );
  expect(getByLabelText("Recording, 4 seconds")).toBeTruthy();
  fireEvent.press(getByLabelText("Stop and transcribe"));
  expect(onStop).toHaveBeenCalledTimes(1);
});

it("keeps transcription cancellable and a recoverable failure retryable", () => {
  const onCancel = jest.fn();
  const onRetry = jest.fn();
  const base = {
    elapsedSeconds: 0,
    levels: [],
    onStart: jest.fn(),
    onStop: jest.fn(),
    onCancel,
    onRetry,
  };
  const { getByLabelText, getByText, rerender } = render(
    <ChatComposer
      accessibilityLabel="Your reply"
      placeholder="Write a reply…"
      value=""
      onChangeText={jest.fn()}
      onSend={jest.fn()}
      dictation={{ ...base, state: "transcribing", message: "Transcribing…" }}
    />,
  );

  expect(getByText("Transcribing…")).toBeTruthy();
  fireEvent.press(getByLabelText("Cancel voice input"));
  expect(onCancel).toHaveBeenCalledTimes(1);

  rerender(
    <ChatComposer
      accessibilityLabel="Your reply"
      placeholder="Write a reply…"
      value=""
      onChangeText={jest.fn()}
      onSend={jest.fn()}
      dictation={{ ...base, state: "error", message: "Voice input failed.", canRetry: true }}
    />,
  );
  expect(getByText("Voice input failed.")).toBeTruthy();
  fireEvent.press(getByLabelText("Retry transcription"));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
