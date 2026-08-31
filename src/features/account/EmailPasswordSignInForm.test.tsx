import type { Session } from "@supabase/supabase-js";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { EmailPasswordSignInForm } from "./EmailPasswordSignInForm";

const mockSignInWithEmailPassword = jest.fn();

jest.mock("../../services/backend/auth", () => ({
  EMAIL_PASSWORD_SIGN_IN_MESSAGE:
    "That email or password wasn't recognized. Try again.",
  signInWithEmailPassword: (...args: unknown[]) =>
    mockSignInWithEmailPassword(...args),
}));

describe("EmailPasswordSignInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the existing-account contract and accessible fields", () => {
    const screen = render(
      <EmailPasswordSignInForm onSuccess={jest.fn()} onBack={jest.fn()} />,
    );

    expect(screen.getByText("Use your Kwilt account")).toBeTruthy();
    expect(
      screen.getByText("Sign in with an existing email account."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.queryByText(/sign up|forgot password/i)).toBeNull();
  });

  it("validates required fields without calling the backend", () => {
    const screen = render(
      <EmailPasswordSignInForm onSuccess={jest.fn()} onBack={jest.fn()} />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter your email and password.")).toBeTruthy();
    expect(mockSignInWithEmailPassword).not.toHaveBeenCalled();
  });

  it("locks while loading and hands the ordinary session to the caller", async () => {
    let resolveSignIn!: (session: Session) => void;
    const pending = new Promise<Session>((resolve) => {
      resolveSignIn = resolve;
    });
    mockSignInWithEmailPassword.mockReturnValue(pending);
    const onSuccess = jest.fn();
    const onBusyChange = jest.fn();
    const screen = render(
      <EmailPasswordSignInForm
        onSuccess={onSuccess}
        onBack={jest.fn()}
        onBusyChange={onBusyChange}
      />,
    );

    fireEvent.changeText(
      screen.getByLabelText("Email"),
      " Reviewer@Example.com ",
    );
    fireEvent.changeText(screen.getByLabelText("Password"), "secret");
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(mockSignInWithEmailPassword).toHaveBeenCalledWith(
      " Reviewer@Example.com ",
      "secret",
    );
    expect(
      screen.getByRole("button", { name: "Sign in" }).props.accessibilityState
        .busy,
    ).toBe(true);
    expect(onBusyChange).toHaveBeenCalledWith(true);

    const session = {
      access_token: "opaque",
      user: { id: "user-1" },
    } as Session;
    resolveSignIn(session);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(session));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("uses one generic error, keeps email, clears password, and allows retry", async () => {
    mockSignInWithEmailPassword
      .mockRejectedValueOnce(new Error("backend detail must not appear"))
      .mockResolvedValueOnce({
        access_token: "opaque",
        user: { id: "user-1" },
      } as Session);
    const onSuccess = jest.fn();
    const screen = render(
      <EmailPasswordSignInForm onSuccess={onSuccess} onBack={jest.fn()} />,
    );

    fireEvent.changeText(
      screen.getByLabelText("Email"),
      "reviewer@example.com",
    );
    fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "That email or password wasn't recognized. Try again.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.queryByText("backend detail must not appear")).toBeNull();
    expect(screen.getByLabelText("Email").props.value).toBe(
      "reviewer@example.com",
    );
    expect(screen.getByLabelText("Password").props.value).toBe("");

    fireEvent.changeText(screen.getByLabelText("Password"), "right");
    fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it("returns to provider choices without cancelling the parent intent", () => {
    const onBack = jest.fn();
    const screen = render(
      <EmailPasswordSignInForm onSuccess={jest.fn()} onBack={onBack} />,
    );

    fireEvent.press(
      screen.getByRole("button", { name: "Back to sign-in options" }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
