import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Linking,
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
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { Icon } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { signInWithProvider, deriveAuthIdentityFromSession } from '../../services/backend/auth';
import { checkUserHasSyncedData } from '../../services/sync/domainSync';
import { AUTH_SIGNIN_WALLPAPERS } from '../../assets/authSignInWallpapers';

export type SignInResult = {
  isReturningUser: boolean;
};

interface SignInInterstitialProps {
  onSignInComplete: (result: SignInResult) => void;
}

const TERMS_URL = 'https://kwilt.app/terms';
const PRIVACY_URL = 'https://kwilt.app/privacy';

const CATCH_MESSAGES = [
  'See the “you” you’re\nbuilding.',
  'Turn a vague vision\ninto clear goals.',
  'From dream to direction.\nOne step at a time.',
  'Craft your path.\nLive with intention.',
  'Your potential,\nmapped out.',
  'Small steps lead to\nbig transformations.',
] as const;

const ROTATION_MS = 14_000;
const BG_CROSSFADE_MS = 2000; // Slower crossfade for smoothness
const TEXT_FADE_OUT_MS = 650;
const TEXT_FADE_IN_MS = 750;

export function SignInInterstitial({ onSignInComplete }: SignInInterstitialProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [loadingProvider, setLoadingProvider] = useState<'apple' | 'google' | null>(null);
  const busy = !!loadingProvider;
  const [error, setError] = useState<string | null>(null);
  
  // State for which image is in which slot
  const [bgBaseIndex, setBgBaseIndex] = useState(0);
  const [bgOverlayIndex, setBgOverlayIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Animated values
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const baseOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Refs for timer-critical values to avoid closure staleness
  const messageIndexRef = useRef(0);
  const activeLayerRef = useRef<'base' | 'overlay'>('base');
  const bgTransitioningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backgroundBaseSource =
    AUTH_SIGNIN_WALLPAPERS[bgBaseIndex % AUTH_SIGNIN_WALLPAPERS.length]?.source;
  const backgroundOverlaySource =
    AUTH_SIGNIN_WALLPAPERS[bgOverlayIndex % AUTH_SIGNIN_WALLPAPERS.length]?.source;

  const handleSignIn = async (provider: 'apple' | 'google') => {
    if (busy) return;
    setLoadingProvider(provider);
    setError(null);
    try {
      const session = await signInWithProvider(provider);
      const identity = deriveAuthIdentityFromSession(session);
      let isReturningUser = false;
      if (identity?.userId) {
        try {
          isReturningUser = await checkUserHasSyncedData(identity.userId);
        } catch {
          isReturningUser = false;
        }
      }
      onSignInComplete({ isReturningUser });
    } catch (err: any) {
      const message = err?.message ?? 'Unable to sign in';
      if (!message.toLowerCase().includes('cancel')) {
        setError(message);
      }
      setLoadingProvider(null);
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(Boolean(enabled));
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const rotate = () => {
      if (bgTransitioningRef.current) return;
      
      const next = (messageIndexRef.current + 1) % CATCH_MESSAGES.length;
      messageIndexRef.current = next;

      if (reduceMotion) {
        setMessageIndex(next);
        setBgBaseIndex(next);
        setBgOverlayIndex(next);
        baseOpacity.setValue(1);
        overlayOpacity.setValue(0);
        return;
      }

      bgTransitioningRef.current = true;

      if (activeLayerRef.current === 'base') {
        // Overlay is hidden. Update it, then crossfade.
        setBgOverlayIndex(next);
        
        // Give React a frame to update the image source before starting the animation
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(overlayOpacity, {
              toValue: 1,
              duration: BG_CROSSFADE_MS,
              useNativeDriver: true,
            }),
            Animated.timing(baseOpacity, {
              toValue: 0,
              duration: BG_CROSSFADE_MS,
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished) {
              activeLayerRef.current = 'overlay';
              bgTransitioningRef.current = false;
            }
          });
        }, 32);
      } else {
        // Base is hidden. Update it, then crossfade.
        setBgBaseIndex(next);
        
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(baseOpacity, {
              toValue: 1,
              duration: BG_CROSSFADE_MS,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: BG_CROSSFADE_MS,
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished) {
              activeLayerRef.current = 'base';
              bgTransitioningRef.current = false;
            }
          });
        }, 32);
      }

      // Text transition
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: TEXT_FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setMessageIndex(next);
          timeoutRef.current = setTimeout(() => {
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: TEXT_FADE_IN_MS,
              useNativeDriver: true,
            }).start();
          }, 100);
        }
      });
    };

    const interval = setInterval(rotate, ROTATION_MS);
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reduceMotion]);

  const backgroundStyle = StyleSheet.absoluteFillObject;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="light" backgroundColor="rgba(0,0,0,0)" />
          <View style={[styles.container, { backgroundColor: colors.pine900 }]}>
            <View pointerEvents="none" style={styles.backgroundLayer}>
              <Animated.Image
                source={backgroundBaseSource}
                style={[backgroundStyle, { opacity: baseOpacity }]}
                resizeMode="cover"
              />
              <Animated.Image
                source={backgroundOverlaySource}
                style={[backgroundStyle, { opacity: overlayOpacity }]}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.18)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </View>
            <View
              style={[
                styles.content,
                {
                  paddingTop: insets.top + spacing.lg,
                  paddingBottom: insets.bottom + spacing.md,
                },
              ]}
            >
              <View style={styles.centerRegion}>
                <View style={styles.centerBlock}>
                  <View style={styles.heroStack}>
                    <View style={styles.logoRow}>
                      <Logo size={44} variant="white" />
                    </View>
                    <Animated.View style={{ opacity: messageOpacity }}>
                      <Text style={styles.heroTitle}>{CATCH_MESSAGES[messageIndex]}</Text>
                    </Animated.View>

                    <View style={styles.buttonStack}>
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
                          <Icon name="apple" size={20} color={colors.textPrimary} />
                          <Text style={styles.appleButtonLabel}>
                            {loadingProvider === 'apple' ? 'Connecting…' : 'Continue with Apple'}
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
                          <Icon name="google" size={20} color={colors.textPrimary} />
                          <Text style={styles.googleButtonLabel}>
                            {loadingProvider === 'google' ? 'Connecting…' : 'Continue with Google'}
                          </Text>
                        </View>
                      </Button>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.disclaimer}>
                By continuing, you agree to our{' '}
                <Text
                  accessibilityRole="link"
                  style={[styles.disclaimer, styles.legalLink]}
                  onPress={() => openUrl(TERMS_URL)}
                  suppressHighlighting
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  accessibilityRole="link"
                  style={[styles.disclaimer, styles.legalLink]}
                  onPress={() => openUrl(PRIVACY_URL)}
                  suppressHighlighting
                >
                  Privacy Policy
                </Text>
                .
              </Text>
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
    backgroundColor: colors.pine900,
  },
  container: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  logoRow: {
    alignItems: 'center',
  },
  centerRegion: {
    flex: 1,
    justifyContent: 'center',
  },
  centerBlock: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroStack: {
    width: '100%',
    alignItems: 'center',
    rowGap: spacing.lg,
  },
  heroTitle: {
    ...typography.titleLg,
    color: colors.canvas,
    textAlign: 'center',
  },
  buttonStack: {
    width: '100%',
    rowGap: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.fieldFill,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  appleButton: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
  },
  appleButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
  },
  googleButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.92)',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.92)',
  },
});
