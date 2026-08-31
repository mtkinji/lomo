import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SignInInterstitial } from "./SignInInterstitial";

const mockCheckUserHasSyncedData = jest.fn();

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return { GestureHandlerRootView: View };
});

jest.mock("@gorhom/bottom-sheet", () => {
  const { View } = require("react-native");
  return { BottomSheetModalProvider: View };
});

jest.mock("../../services/backend/auth", () => ({
  deriveAuthIdentityFromSession: jest.fn(() => ({ userId: "review-user" })),
  signInWithProvider: jest.fn(),
}));

jest.mock("../../services/sync/domainSync", () => ({
  checkUserHasSyncedData: (...args: unknown[]) =>
    mockCheckUserHasSyncedData(...args),
}));

jest.mock("../account/EmailPasswordSignInForm", () => {
  const { Button } = require("../../ui/Button");
  return {
    EmailPasswordSignInForm: ({
      onSuccess,
    }: {
      onSuccess: (session: unknown) => void;
    }) => (
      <Button
        accessibilityLabel="Complete test email sign-in"
        onPress={() => onSuccess({ user: { id: "review-user" } })}
      >
        Complete test email sign-in
      </Button>
    ),
  };
});

describe("SignInInterstitial email sign-in", () => {
  it("keeps email visually secondary and sends its session through returning-user completion", async () => {
    mockCheckUserHasSyncedData.mockResolvedValue(true);
    const onSignInComplete = jest.fn();
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <SignInInterstitial onSignInComplete={onSignInComplete} />
      </SafeAreaProvider>,
    );

    expect(screen.getByLabelText("Continue with Apple")).toBeTruthy();
    expect(screen.getByLabelText("Continue with Google")).toBeTruthy();
    expect(screen.getByLabelText("Sign in with email")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Sign in with email"));
    fireEvent.press(screen.getByLabelText("Complete test email sign-in"));

    await waitFor(() =>
      expect(onSignInComplete).toHaveBeenCalledWith({ isReturningUser: true }),
    );
    expect(mockCheckUserHasSyncedData).toHaveBeenCalledWith("review-user");
  });

  it("names the alternate setup path as a shared device", () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <SignInInterstitial
          onSignInComplete={jest.fn()}
          onSetUpChildDevice={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByLabelText("Set up a shared device")).toBeTruthy();
    expect(screen.queryByText("Set up a child’s device")).toBeNull();
  });
});
