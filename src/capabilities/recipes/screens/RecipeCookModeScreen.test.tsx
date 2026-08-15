import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  recipeContractFixture,
  recipeVersionContractFixture,
} from "../domain/recipeContractFixtures";
import { useRecipeCookSession } from "../runtime/useRecipeCookSession";
import { RecipeCookModeExperience } from "./RecipeCookModeScreen";

jest.mock("../runtime/useRecipeCookSession");
jest.mock("../data/cookModeEducationCache", () => ({
  cookModeEducationCache: {
    hasAcknowledgedVoiceGuide: jest.fn(async () => true),
    acknowledgeVoiceGuide: jest.fn(async () => undefined),
  },
}));
jest.mock("expo-video", () => ({
  useVideoPlayer: () => ({}),
  VideoView: ({ accessibilityLabel }: { accessibilityLabel: string }) =>
    require("react").createElement(require("react-native").View, {
      accessibilityLabel,
    }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("../voice/cookVoiceTransport", () => ({
  cookVoiceTransport: {
    start: jest.fn(),
    stopAndTranscribe: jest.fn(),
    cancel: jest.fn(),
  },
}));
jest.mock("../voice/cookVoiceSpeech", () => ({
  cookVoiceSpeech: {
    speak: jest.fn(async (_text: string, onStart?: () => void) => {
      onStart?.();
    }),
    stop: jest.fn(async () => undefined),
  },
}));
jest.mock("../voice/cookVoiceReceiptSound", () => ({
  playCookVoiceReceiptSound: jest.fn(async () => undefined),
}));
jest.mock("../../../services/analytics/useAnalytics", () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

const mockUseRecipeCookSession = useRecipeCookSession as jest.MockedFunction<
  typeof useRecipeCookSession
>;

describe("RecipeCookModeExperience", () => {
  it("keeps one touch-and-voice surface while a saved cook session restores", async () => {
    const start = jest.fn();
    mockUseRecipeCookSession.mockReturnValue({
      restoring: true,
      session: null,
      cues: [],
      start,
    } as never);

    const projection = {
      recipe: recipeContractFixture(),
      currentVersion: recipeVersionContractFixture(),
    };
    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
    } as never;
    const screen = render(
      <RecipeCookModeExperience
        projection={projection}
        servings={4}
        landscape={true}
        navigation={navigation}
      />,
    );

    mockUseRecipeCookSession.mockReturnValue({
      restoring: false,
      session: {
        id: "session-1",
        currentCueIndex: 0,
        cueCount: 2,
        status: "active",
        timers: [],
      },
      cues: [
        {
          id: "cue-1",
          instructionId: "phase-2",
          position: 0,
          section: null,
          phasePosition: 1,
          phaseCount: 5,
          cuePositionInPhase: 0,
          cueCountInPhase: 2,
          displayText: "Mix the ingredients.",
          actionText: "Mix the ingredients.",
          supportingCue: {
            kind: "ready_when",
            text: "The batter is just combined.",
          },
          media: {
            assetId: "media-1",
            storageRef: "https://example.com/mixing.jpg",
            mediaType: "image/jpeg",
            altText: "Pancake batter being mixed",
          },
          ingredientReferences: [
            {
              ingredientLineId: "ingredient-1",
              concept: "all-purpose flour",
              displayAmount: "2 cups",
            },
          ],
          timerSuggestions: [],
        },
      ],
      start,
      send: jest.fn(),
      startTimer: jest.fn(),
    } as never);

    expect(() =>
      screen.rerender(
        <RecipeCookModeExperience
          projection={projection}
          servings={4}
          landscape={true}
          navigation={navigation}
        />,
      ),
    ).not.toThrow();
    expect(screen.getByText("Grandma Ruth's Cake")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.getByText("Next")).toBeTruthy();
    expect(screen.queryByText("1 of 2")).toBeNull();
    expect(screen.queryByText("2 of 2")).toBeNull();
    expect(screen.queryByText("Phase 2 of 5 · Action 1 of 2")).toBeNull();
    expect(screen.getByTestId("cook-instruction-pane")).toBeTruthy();
    expect(screen.getByTestId("cook-ingredient-rail")).toBeTruthy();
    expect(screen.getByTestId("cook-transport")).toBeTruthy();
    expect(screen.queryByLabelText("Kwilt")).toBeNull();
    expect(
      screen.getByLabelText("Grandma Ruth's Cake recipe thumbnail"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Exit Cook Mode")).toBeTruthy();
    expect(screen.queryByText("Exit")).toBeNull();
    expect(screen.getByText("Mix the ingredients.")).toBeTruthy();
    expect(screen.getByText("Ready when")).toBeTruthy();
    expect(screen.getByText("The batter is just combined.")).toBeTruthy();
    expect(screen.queryByText("For this step")).toBeNull();
    expect(screen.getByText("2 cups all-purpose flour")).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: "2 cups all-purpose flour" }),
    ).toBeTruthy();
    expect(screen.queryByText("Ingredients")).toBeNull();
    expect(screen.getByText("Show photo")).toBeTruthy();
    expect(
      screen.queryByText("Say “Next,” “Repeat,” or “Start a timer.”"),
    ).toBeNull();
    expect(screen.queryByText("Hands-free")).toBeNull();
    expect(screen.queryByText("Use touch controls")).toBeNull();
    expect(screen.queryByText("Repeat")).toBeNull();
    expect(screen.queryByText("Speak a command")).toBeNull();
    await waitFor(() => expect(screen.getByText("Listening")).toBeTruthy());

    const voiceTransport = jest.requireMock(
      "../voice/cookVoiceTransport",
    ).cookVoiceTransport;
    const receiptSound = jest.requireMock(
      "../voice/cookVoiceReceiptSound",
    ).playCookVoiceReceiptSound;
    voiceTransport.stopAndTranscribe.mockImplementationOnce(
      async ({ onRecordingStopped }: { onRecordingStopped(): Promise<void> }) => {
        await onRecordingStopped();
        return "what?";
      },
    );
    fireEvent.press(screen.getByText("Listening"));
    await waitFor(() => expect(receiptSound).toHaveBeenCalledTimes(1));

    voiceTransport.cancel.mockClear();
    voiceTransport.start.mockClear();
    fireEvent.press(screen.getByText("Show photo"));
    expect(voiceTransport.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Paused")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Close full-screen photo"));
    await waitFor(() => expect(voiceTransport.start).toHaveBeenCalledTimes(1));
  });

  it("uses the full landscape body and literal navigation when a cue has no ingredients", async () => {
    const projection = {
      recipe: recipeContractFixture(),
      currentVersion: recipeVersionContractFixture(),
    };
    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
      popTo: jest.fn(),
      replace: jest.fn(),
    };
    const send = jest.fn(async () => undefined);
    mockUseRecipeCookSession.mockReturnValue({
      restoring: false,
      session: {
        id: "session-2",
        currentCueIndex: 1,
        cueCount: 3,
        status: "active",
        timers: [],
      },
      cues: [
        {} as never,
        {
          id: "cue-2",
          instructionId: "phase-3",
          position: 1,
          section: null,
          phasePosition: 2,
          phaseCount: 5,
          cuePositionInPhase: 0,
          cueCountInPhase: 2,
          displayText:
            "Pour wet into dry and fold only until no dry pockets remain.",
          actionText:
            "Pour wet into dry and fold only until no dry pockets remain.",
          supportingCue: null,
          media: null,
          ingredientReferences: [],
          timerSuggestions: [],
        },
        {} as never,
      ],
      start: jest.fn(),
      send,
      startTimer: jest.fn(),
    } as never);

    const screen = render(
      <RecipeCookModeExperience
        projection={projection}
        servings={4}
        landscape={true}
        navigation={navigation as never}
      />,
    );

    expect(screen.getByTestId("cook-landscape-body")).toBeTruthy();
    expect(screen.getByTestId("cook-instruction-pane")).toBeTruthy();
    expect(screen.queryByTestId("cook-ingredient-rail")).toBeNull();
    expect(screen.getByLabelText("Back to previous action")).toBeTruthy();
    expect(screen.getByLabelText("Continue to next action")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
    expect(screen.getByText("Next")).toBeTruthy();
    expect(screen.queryByText("1 of 3")).toBeNull();
    expect(screen.queryByText("3 of 3")).toBeNull();
    expect(screen.queryByText("2 of 3")).toBeNull();
    expect(screen.queryByText("Phase 3 of 5 · Action 1 of 2")).toBeNull();
    await waitFor(() => expect(screen.getByText("Listening")).toBeTruthy());

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    fireEvent.press(screen.getByLabelText("Exit Cook Mode"));
    const actions = alertSpy.mock.calls[0]?.[2];
    actions?.[1]?.onPress?.();

    expect(send).toHaveBeenCalledWith({ type: "pause" });
    expect(navigation.popTo).toHaveBeenCalledWith("RecipeHome", {
      recipeId: projection.recipe.id,
    });
    expect(navigation.navigate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
