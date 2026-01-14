import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PortalHost } from '@rn-primitives/portal';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { signInWithProvider, deriveAuthIdentityFromSession } from '../../services/backend/auth';
import { checkUserHasSyncedData } from '../../services/sync/domainSync';

export type SignInResult = {
  isReturningUser: boolean;
};

interface SignInInterstitialProps {
  onSignInComplete: (result: SignInResult) => void;
}

export function SignInInterstitial({ onSignInComplete }: SignInInterstitialProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const illustrationSource = require('../../../assets/illustrations/welcome.png');
  const illustrationSlotHeight = Math.round(Math.min(320, windowHeight * 0.38));
  const illustrationWidth = Math.min(340, windowWidth - spacing.xl * 2);
  const illustrationHeight = Math.min(illustrationSlotHeight, Math.round(illustrationWidth * 0.78));

  const handleSignIn = async (provider: 'apple' | 'google') => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await signInWithProvider(provider);
      
      // Check if this is a returning user with existing data
      const identity = deriveAuthIdentityFromSession(session);
      let isReturningUser = false;
      
      if (identity?.userId) {
        try {
          isReturningUser = await checkUserHasSyncedData(identity.userId);
        } catch {
          // On error, assume new user
          isReturningUser = false;
        }
      }
      
      onSignInComplete({ isReturningUser });
    } catch (err: any) {
      const message = err?.message ?? 'Unable to sign in';
      // Don't show error for user cancellation
      if (!message.toLowerCase().includes('cancel')) {
        setError(message);
      }
      setBusy(false);
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" backgroundColor={colors.pine300} />
          <View style={[styles.container, { backgroundColor: colors.pine300 }]}>
            <View
              style={[
                styles.content,
                {
                  paddingTop: insets.top + spacing.xl,
                  paddingBottom: insets.bottom + spacing.sm,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerBlock}>
                <View style={styles.logoRow}>
                  <Logo size={32} variant="default" />
                </View>
                <Text style={styles.title}>Welcome to Kwilt</Text>
                <Text style={styles.body}>
                  Sign in to start building your path forward. Your progress syncs
                  across devices and stays safe.
                </Text>
              </View>

              {/* Illustration */}
              <View style={[styles.illustrationCenter, { minHeight: illustrationSlotHeight }]}>
                <Image
                  source={illustrationSource as number}
                  style={{
                    width: illustrationWidth,
                    height: illustrationHeight,
                  }}
                  resizeMode="contain"
                  accessibilityLabel="Welcome illustration"
                />
              </View>

              {/* Footer with sign-in buttons */}
              <View style={styles.footer}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Button
                  fullWidth
                  disabled={busy}
                  style={styles.appleButton}
                  onPress={() => handleSignIn('apple')}
                  accessibilityLabel="Continue with Apple"
                >
                  <View style={styles.buttonContent}>
                    <Icon name="apple" size={20} color={colors.canvas} />
                    <Text style={styles.appleButtonLabel}>
                      {busy ? 'Connecting…' : 'Continue with Apple'}
                    </Text>
                  </View>
                </Button>

                <Button
                  variant="outline"
                  fullWidth
                  disabled={busy}
                  style={styles.googleButton}
                  onPress={() => handleSignIn('google')}
                  accessibilityLabel="Continue with Google"
                >
                  <View style={styles.buttonContent}>
                    <Icon name="google" size={20} color={colors.pine900} />
                    <Text style={styles.googleButtonLabel}>Continue with Google</Text>
                  </View>
                </Button>

                <Text style={styles.disclaimer}>
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </Text>
              </View>
            </View>
          </View>
          <PortalHost />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  headerBlock: {
    rowGap: spacing.md,
  },
  logoRow: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.titleSm,
    color: colors.pine900,
  },
  body: {
    ...typography.body,
    color: colors.pine900,
    opacity: 0.85,
  },
  illustrationCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  footer: {
    rowGap: spacing.sm,
  },
  errorContainer: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.pine900,
    textAlign: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  appleButton: {
    backgroundColor: colors.pine700,
    borderColor: colors.pine700,
  },
  appleButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: colors.pine700,
  },
  googleButtonLabel: {
    ...typography.body,
    color: colors.pine900,
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.caption,
    color: colors.pine900,
    opacity: 0.65,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

