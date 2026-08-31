import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { StyleSheet, View } from "react-native";
import { colors, spacing, typography } from "../../theme";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Text, VStack } from "../../ui/primitives";
import {
  EMAIL_PASSWORD_SIGN_IN_MESSAGE,
  signInWithEmailPassword,
} from "../../services/backend/auth";

type EmailPasswordSignInFormProps = {
  onSuccess: (session: Session) => void | Promise<void>;
  onBack: () => void;
  onBusyChange?: (busy: boolean) => void;
  tone?: "light" | "dark";
};

const REQUIRED_FIELDS_MESSAGE = "Enter your email and password.";

export function EmailPasswordSignInForm({
  onSuccess,
  onBack,
  onBusyChange,
  tone = "light",
}: EmailPasswordSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setSubmissionBusy = (nextBusy: boolean) => {
    setBusy(nextBusy);
    onBusyChange?.(nextBusy);
  };

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError(REQUIRED_FIELDS_MESSAGE);
      return;
    }

    setError(null);
    setSubmissionBusy(true);
    try {
      const session = await signInWithEmailPassword(email, password);
      await onSuccess(session);
    } catch {
      setPassword("");
      setError(EMAIL_PASSWORD_SIGN_IN_MESSAGE);
    } finally {
      setSubmissionBusy(false);
    }
  };

  const dark = tone === "dark";

  return (
    <VStack space="md" style={styles.root}>
      <VStack space="xs">
        <Text style={[styles.title, dark && styles.darkTitle]}>
          Use your Kwilt account
        </Text>
        <Text style={[styles.support, dark && styles.darkSupport]}>
          Sign in with an existing email account.
        </Text>
      </VStack>

      <VStack space="sm">
        {dark ? <Text style={styles.darkFieldLabel}>Email</Text> : null}
        <Input
          label={dark ? undefined : "Email"}
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        {dark ? <Text style={styles.darkFieldLabel}>Password</Text> : null}
        <Input
          label={dark ? undefined : "Password"}
          accessibilityLabel="Password"
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
      </VStack>

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <VStack space="xs">
        <Button
          fullWidth
          loading={busy}
          loadingLabel="Signing in…"
          disabled={busy}
          onPress={() => void submit()}
          accessibilityLabel="Sign in"
        >
          Sign in
        </Button>
        <Button
          fullWidth
          variant="ghost"
          disabled={busy}
          onPress={onBack}
          accessibilityLabel="Back to sign-in options"
        >
          <Text style={[styles.backLabel, dark && styles.darkBackLabel]}>
            Back to sign-in options
          </Text>
        </Button>
      </VStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  darkTitle: {
    color: colors.canvas,
  },
  support: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  darkSupport: {
    color: "rgba(255,255,255,0.84)",
  },
  darkFieldLabel: {
    ...typography.bodySm,
    color: colors.canvas,
    fontWeight: "600",
    marginBottom: -spacing.xs,
  },
  errorContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.fieldFill,
    padding: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    textAlign: "center",
  },
  backLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  darkBackLabel: {
    color: colors.canvas,
  },
});
