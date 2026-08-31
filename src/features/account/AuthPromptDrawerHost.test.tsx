import type { Session } from "@supabase/supabase-js";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AuthPromptDrawerHost } from "./AuthPromptDrawerHost";
import { useAuthPromptStore } from "../../store/useAuthPromptStore";

const mockSignInWithEmailPassword = jest.fn();

jest.mock("../../services/backend/auth", () => ({
  EMAIL_PASSWORD_SIGN_IN_MESSAGE:
    "That email or password wasn't recognized. Try again.",
  signInWithEmailPassword: (...args: unknown[]) =>
    mockSignInWithEmailPassword(...args),
  signInWithProvider: jest.fn(),
}));

jest.mock("../../ui/BottomDrawer", () => {
  const { View } = require("react-native");
  return {
    BottomDrawer: ({
      visible,
      children,
    }: {
      visible: boolean;
      children: React.ReactNode;
    }) => (visible ? <View>{children}</View> : null),
  };
});

describe("AuthPromptDrawerHost email sign-in", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthPromptStore.setState({
      visible: false,
      reason: null,
      busy: false,
      deferred: null,
    });
  });

  it("keeps providers primary, keeps email quiet, and resolves the original intent", async () => {
    const resolve = jest.fn();
    const reject = jest.fn();
    useAuthPromptStore.setState({
      visible: true,
      reason: "plan",
      busy: false,
      deferred: { resolve, reject },
    });
    const session = {
      access_token: "opaque",
      user: { id: "user-1" },
    } as Session;
    mockSignInWithEmailPassword.mockResolvedValue(session);
    const screen = render(<AuthPromptDrawerHost />);

    expect(screen.getByLabelText("Continue with Apple")).toBeTruthy();
    expect(screen.getByLabelText("Continue with Google")).toBeTruthy();
    expect(screen.getByLabelText("Sign in with email")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Sign in with email"));
    fireEvent.changeText(
      screen.getByLabelText("Email"),
      "reviewer@example.com",
    );
    fireEvent.changeText(screen.getByLabelText("Password"), "secret");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => expect(resolve).toHaveBeenCalledWith(session));
    expect(reject).not.toHaveBeenCalled();
    expect(useAuthPromptStore.getState().visible).toBe(false);
  });

  it("backs out of the email form without rejecting the pending intent", () => {
    const reject = jest.fn();
    useAuthPromptStore.setState({
      visible: true,
      reason: "settings",
      busy: false,
      deferred: { resolve: jest.fn(), reject },
    });
    const screen = render(<AuthPromptDrawerHost />);

    fireEvent.press(screen.getByLabelText("Sign in with email"));
    fireEvent.press(screen.getByLabelText("Back to sign-in options"));

    expect(screen.getByLabelText("Continue with Apple")).toBeTruthy();
    expect(reject).not.toHaveBeenCalled();
    expect(useAuthPromptStore.getState().visible).toBe(true);
  });
});
