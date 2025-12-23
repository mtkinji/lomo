import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../ui/Icon';
import { colors, spacing, typography } from '../../theme';
import { useFirstTimeUxStore } from '../../store/useFirstTimeUxStore';
import { useAppStore } from '../../store/useAppStore';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { AgentWorkspace } from '../ai/AgentWorkspace';
import { AppShell } from '../../ui/layout/AppShell';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { getWorkflowLaunchConfig } from '../ai/workflowRegistry';
import { FullScreenInterstitial } from '../../ui/FullScreenInterstitial';
import { NotificationService } from '../../services/NotificationService';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

type FtueStep = 'welcome' | 'notifications' | 'path';

export function FirstTimeUxFlow() {
  const isVisible = useFirstTimeUxStore((state) => state.isFlowActive);
  const triggerCount = useFirstTimeUxStore((state) => state.triggerCount);
  const dismissFlow = useFirstTimeUxStore((state) => state.dismissFlow);
  const startFlow = useFirstTimeUxStore((state) => state.startFlow);
  const completeFlow = useFirstTimeUxStore((state) => state.completeFlow);
  const requestDevAutoCompleteToAvatar = useFirstTimeUxStore(
    (state) => state.requestDevAutoCompleteToAvatar
  );
  const resetOnboardingAnswers = useAppStore((state) => state.resetOnboardingAnswers);
  const lastOnboardingGoalId = useAppStore((state) => state.lastOnboardingGoalId);
  const lastOnboardingArcId = useAppStore((state) => state.lastOnboardingArcId);
  const setLastOnboardingArcId = useAppStore((state) => state.setLastOnboardingArcId);
  const setLastOnboardingGoalId = useAppStore((state) => state.setLastOnboardingGoalId);
  const setHasSeenFirstArcCelebration = useAppStore((state) => state.setHasSeenFirstArcCelebration);
  const setHasDismissedOnboardingGoalGuide = useAppStore(
    (state) => state.setHasDismissedOnboardingGoalGuide
  );
  const setHasCompletedFirstTimeOnboarding = useAppStore(
    (state) => state.setHasCompletedFirstTimeOnboarding
  );
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [ftueStep, setFtueStep] = useState<FtueStep>('welcome');
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isAutoRequestingNotifications, setIsAutoRequestingNotifications] = useState(false);
  const { capture } = useAnalytics();
  const hasTrackedVisible = useRef(false);

  const hasAutoRequestedNotifications = useRef(false);
  const notificationAutoPromptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const introAnim = useRef(new Animated.Value(1)).current;
  const workflowAnim = useRef(new Animated.Value(0)).current;
  // FTUE is only shown for onboarding runs. Keep the interstitial sequence stable
  // (1/3 → 2/3 → 3/3) even if notifications are already enabled.
  const flowSteps: FtueStep[] = ['welcome', 'notifications', 'path'];

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && !hasTrackedVisible.current) {
      hasTrackedVisible.current = true;
      capture(AnalyticsEvent.FtueStarted, {
        trigger_count: triggerCount,
        includes_notifications_step: true,
      });
    }

    if (!isVisible) {
      hasTrackedVisible.current = false;
    }
  }, [capture, isVisible, triggerCount]);

  // Reset the FTUE sequence whenever the flow (re)opens so repeated runs
  // always start at the first interstitial.
  useEffect(() => {
    if (!isVisible) {
      return;
    }
    // Reset onboarding-only handoff/guide flags so the Arc landing experience is consistent
    // for each fresh FTUE run (especially when replaying via dev tools).
    setHasSeenFirstArcCelebration(false);
    setHasDismissedOnboardingGoalGuide(false);
    setLastOnboardingArcId(null);
    setLastOnboardingGoalId(null);
    setFtueStep('welcome');
    setShowWorkflow(false);
    introAnim.setValue(1);
    workflowAnim.setValue(0);
    setNotificationError(null);
    setIsAutoRequestingNotifications(false);
    hasAutoRequestedNotifications.current = false;
    if (notificationAutoPromptTimer.current) {
      clearTimeout(notificationAutoPromptTimer.current);
      notificationAutoPromptTimer.current = null;
    }
  }, [
    isVisible,
    triggerCount,
    introAnim,
    workflowAnim,
    setHasSeenFirstArcCelebration,
    setHasDismissedOnboardingGoalGuide,
    setLastOnboardingArcId,
    setLastOnboardingGoalId,
  ]);

  useEffect(() => {
    if (!isVisible) return;
    if (ftueStep !== 'notifications') return;
    if (hasAutoRequestedNotifications.current) return;
    // If notifications are already enabled, do not request again.
    if (notificationPreferences.osPermissionStatus === 'authorized') return;

    hasAutoRequestedNotifications.current = true;
    setNotificationError(null);
    setIsAutoRequestingNotifications(true);
    capture(AnalyticsEvent.NotificationsPermissionPrompted, {
      source: 'ftue_auto',
    });

    notificationAutoPromptTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const granted = await NotificationService.requestOsPermission();
          const updatedStatus = useAppStore.getState().notificationPreferences.osPermissionStatus;
          capture(AnalyticsEvent.NotificationsPermissionResult, {
            source: 'ftue_auto',
            granted,
            os_permission_status: updatedStatus,
          });
          if (granted) {
            const currentPrefs = useAppStore.getState().notificationPreferences;
            const next = {
              ...currentPrefs,
              notificationsEnabled: true,
              allowDailyShowUp: true,
              dailyShowUpTime: currentPrefs.dailyShowUpTime ?? '08:00',
                // Daily focus is a high-signal “one thing” nudge: default it on
                // alongside the daily show-up reminder, using the same time.
                allowDailyFocus: true,
                dailyFocusTime:
                  currentPrefs.dailyFocusTime ?? currentPrefs.dailyShowUpTime ?? '08:00',
              // Activity reminders are the most directly tied to “next step”.
              allowActivityReminders: true,
            };
            await NotificationService.applySettings(next);
          } else {
            const updated = useAppStore.getState().notificationPreferences.osPermissionStatus;
            if (updated === 'denied' || updated === 'restricted') {
              setNotificationError(
                'Notifications are currently blocked in system settings. You can change this anytime.',
              );
            }
          }
        } catch (err) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[onboarding] notifications auto-enable failed', err);
          }
          setNotificationError('No problem — you can enable notifications later in Settings.');
        } finally {
          setIsAutoRequestingNotifications(false);
          notificationAutoPromptTimer.current = null;
          // Important: do not auto-advance; let the user read the screen and tap Continue.
        }
      })();
    }, 450);

    return () => {
      if (notificationAutoPromptTimer.current) {
        clearTimeout(notificationAutoPromptTimer.current);
        notificationAutoPromptTimer.current = null;
      }
    };
    // Intentionally not depending on `notificationPreferences` as a whole to avoid
    // restarting the timer while we update preferences during the request flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ftueStep, isVisible, notificationPreferences.osPermissionStatus]);

  // Animate each interstitial screen in with a light slide-from-right +
  // fade so the sequence feels premium but not busy.
  useEffect(() => {
    if (!isVisible || showWorkflow) return;
    introAnim.setValue(0);
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [ftueStep, introAnim, isVisible, showWorkflow]);

  const handleAdvanceStep = (nextStep: FtueStep | 'workflow') => {
    if (nextStep === 'workflow') {
      // Fade out the final interstitial, then reveal the workflow host with
      // a subtle scale-and-fade in.
      Animated.timing(introAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setShowWorkflow(true);
        workflowAnim.setValue(0);
        Animated.timing(workflowAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    setFtueStep(nextStep);
  };

  const renderFtueInterstitial = () => {
    const currentIndex = Math.max(0, flowSteps.indexOf(ftueStep));
    const totalSteps = flowSteps.length;
    const stepTheme = (() => {
      switch (ftueStep) {
        case 'welcome':
          return {
            backgroundColor: 'pine300' as const,
            ink: colors.pine900,
            inkMutedOpacity: 0.75,
            primaryButtonBg: colors.pine700,
            primaryButtonText: colors.canvas,
            secondaryText: colors.pine900,
            progressTrack: 'rgba(31,82,38,0.18)',
            progressFill: colors.pine700,
          };
        case 'notifications':
          return {
            // Lighter surface to improve perceived contrast and reduce heaviness.
            backgroundColor: 'turmeric300' as const,
            ink: colors.sumi,
            inkMutedOpacity: 0.72,
            primaryButtonBg: colors.sumi,
            primaryButtonText: colors.canvas,
            secondaryText: colors.sumi,
            progressTrack: 'rgba(0,0,0,0.14)',
            progressFill: colors.sumi,
          };
        case 'path':
        default:
          return {
            // Quilt blue moment: cool, optimistic, and distinctly “Kwilt”.
            backgroundColor: 'quiltBlue200' as const,
            ink: colors.quiltBlue900,
            inkMutedOpacity: 0.76,
            primaryButtonBg: colors.quiltBlue700,
            primaryButtonText: colors.canvas,
            secondaryText: colors.quiltBlue900,
            progressTrack: 'rgba(36,54,78,0.18)',
            progressFill: colors.quiltBlue700,
          };
      }
    })();

    let title: string;
    let body: string;
    let ctaLabel: string;
    let nextStep: FtueStep | 'workflow';
    let stepIndex = currentIndex + 1;
    const illustrationSource =
      ftueStep === 'welcome'
        ? require('../../../assets/illustrations/welcome.png')
        : ftueStep === 'notifications'
          ? require('../../../assets/illustrations/notifications.png')
          : ftueStep === 'path'
            ? require('../../../assets/illustrations/aspirations.png')
          : null;
    const showIllustration = Boolean(illustrationSource);
    const illustrationScale =
      ftueStep === 'notifications'
        ? 1.12
        : 1.0;
    const illustrationSlotHeight = Math.round(Math.min(320, windowHeight * 0.42));
    const baseIllustrationWidth = Math.min(340, windowWidth - spacing.xl * 2);
    const illustrationWidth = Math.min(
      windowWidth - spacing.xl * 2,
      Math.round(baseIllustrationWidth * illustrationScale),
    );
    const illustrationHeight = Math.min(illustrationSlotHeight, Math.round(illustrationWidth * 0.78));

    switch (ftueStep) {
      case 'welcome':
        title = 'Welcome to Kwilt';
        body =
          'Kwilt makes it easier to clarify who you want to become and grow into the best version of yourself.';
        ctaLabel = totalSteps > 2 ? 'Next' : 'Continue';
        nextStep = totalSteps > 2 ? 'notifications' : 'path';
        break;
      case 'notifications':
        title = 'Setup regular prompts';
        body =
          'Kwilt will help you along with gentle reminders so tiny steps don’t slip through the cracks.';
        ctaLabel = 'Continue';
        nextStep = 'path';
        break;
      case 'path':
      default:
        title = 'Build your path forward';
        body =
          'We’ll start by turning an aspiration you have into an identity Arc (a clear picture of who you want to become), then shape Goals and small daily Activities. Next, you’ll answer a few quick questions in chat to build your first Arc.';
        ctaLabel = 'Let’s begin';
        nextStep = 'workflow';
        break;
    }

    const bodyContent: ReactNode =
      ftueStep === 'path' ? (
        <>
          We’ll start by turning one aspiration into your first identity{' '}
          <Text style={styles.ftueBodyEmphasis}>Arc</Text> (a clear picture of who you’re becoming), then
          shape <Text style={styles.ftueBodyEmphasis}>Goals</Text> and small daily{' '}
          <Text style={styles.ftueBodyEmphasis}>Activities</Text>. Next, you’ll answer a few quick questions
          in chat to build your first Arc.
        </>
      ) : (
        body
      );

    const translateX = introAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [24, 0],
    });

    const opacity = introAnim;

    return (
      <FullScreenInterstitial
        visible
        backgroundColor={stepTheme.backgroundColor}
        progression="button"
        withinModal
        contentStyle={styles.ftueInterstitialHost}
      >
        <Animated.View
          style={[
            styles.ftueInterstitialContent,
            {
              opacity,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.ftueLayout}>
            <View style={styles.ftueHeaderBlock}>
              <View style={styles.ftueProgressRow}>
                <Text
                  style={[styles.ftueEyebrow, { color: stepTheme.ink, opacity: stepTheme.inkMutedOpacity }]}
                >
                  First-time setup
                </Text>
                <Text
                  style={[
                    styles.ftueProgressLabel,
                    { color: stepTheme.ink, opacity: stepTheme.inkMutedOpacity },
                  ]}
                >
                  {stepIndex}/{totalSteps}
                </Text>
              </View>
              <View
                style={[styles.ftueProgressTrack, { backgroundColor: stepTheme.progressTrack }]}
                accessibilityLabel="Onboarding progress"
              >
                <View
                  style={[
                    styles.ftueProgressFill,
                    { backgroundColor: stepTheme.progressFill },
                    { width: `${Math.round((stepIndex / totalSteps) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.ftueTitle, { color: stepTheme.ink }]}>{title}</Text>
            </View>

            {showIllustration ? (
              <View style={[styles.ftueIllustrationCenter, { minHeight: illustrationSlotHeight }]}>
                <Image
                  source={illustrationSource as number}
                  style={{
                    width: illustrationWidth,
                    height: illustrationHeight,
                  }}
                  resizeMode="contain"
                  accessibilityLabel="Onboarding illustration"
                />
              </View>
            ) : null}

            <View style={[styles.ftueFooter, { paddingBottom: insets.bottom + spacing.xs }]}>
              <Text style={[styles.ftueBody, styles.ftueFooterCopy, { color: stepTheme.ink }]}>
                {bodyContent}
              </Text>

              {ftueStep === 'notifications' &&
              notificationPreferences.osPermissionStatus !== 'authorized' ? (
                <>
                  <Text style={[styles.ftuePermissionHint, { color: stepTheme.ink }]}>
                    {notificationPreferences.osPermissionStatus === 'denied' ||
                    notificationPreferences.osPermissionStatus === 'restricted'
                      ? 'iOS notifications are currently blocked for kwilt.'
                      : isAutoRequestingNotifications
                        ? 'Asking iOS for permission…'
                        : 'You’ll see an iOS prompt to allow notifications.'}
                  </Text>
                  {notificationError ? (
                    <Text style={[styles.ftueError, { color: stepTheme.ink }]}>{notificationError}</Text>
                  ) : null}
                </>
              ) : null}

              <View style={styles.ftuePrimarySlot}>
                <Button
                  variant="accent"
                  fullWidth
                  disabled={ftueStep === 'notifications' ? isAutoRequestingNotifications : false}
                  style={[
                    styles.ftuePrimaryButton,
                    { backgroundColor: stepTheme.primaryButtonBg, borderColor: stepTheme.primaryButtonBg },
                  ]}
                  onPress={() => {
                    if (ftueStep === 'notifications') {
                      if (
                        notificationPreferences.osPermissionStatus === 'denied' ||
                        notificationPreferences.osPermissionStatus === 'restricted'
                      ) {
                        void Linking.openSettings();
                        return;
                      }
                    }
                    handleAdvanceStep(nextStep);
                  }}
                >
                  <Text style={[styles.ftuePrimaryButtonLabel, { color: stepTheme.primaryButtonText }]}>
                    {ftueStep === 'notifications' &&
                    (notificationPreferences.osPermissionStatus === 'denied' ||
                      notificationPreferences.osPermissionStatus === 'restricted')
                      ? 'Open settings'
                      : ftueStep === 'notifications' && isAutoRequestingNotifications
                        ? 'Enabling…'
                        : ctaLabel}
                  </Text>
                </Button>
              </View>

              <View style={styles.ftueSecondarySlot}>
                {ftueStep === 'notifications' ? (
                  <Button
                    variant="ghost"
                    fullWidth
                    onPress={() => {
                      if (notificationAutoPromptTimer.current) {
                        clearTimeout(notificationAutoPromptTimer.current);
                        notificationAutoPromptTimer.current = null;
                      }
                      setIsAutoRequestingNotifications(false);
                      handleAdvanceStep(nextStep);
                    }}
                  >
                    <Text style={[styles.ftueSecondaryButtonLabel, { color: stepTheme.secondaryText }]}>
                      {notificationPreferences.osPermissionStatus === 'denied' ||
                      notificationPreferences.osPermissionStatus === 'restricted'
                        ? 'Continue'
                        : 'Not now'}
                    </Text>
                  </Button>
                ) : (
                  <View style={styles.ftueSecondaryPlaceholder} />
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      </FullScreenInterstitial>
    );
  };

  if (!isVisible) {
    return null;
  }

  const workspaceKey = `v2:${triggerCount}`;
  const onboardingWorkflow = getWorkflowLaunchConfig('firstTimeOnboarding');

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        {__DEV__ && (
          <>
            <View style={[styles.devExitRow, { top: insets.top + 8 }]}>
              <Button
                variant="accent"
                size="icon"
                iconButtonSize={28}
                onPress={() => setShowDevMenu((prev) => !prev)}
                accessibilityLabel="Dev tools menu"
                style={styles.devExitButton}
              >
                <Icon name="dev" color={colors.canvas} size={16} />
              </Button>
            </View>
            {showDevMenu && (
              <>
                <Pressable style={styles.devMenuOverlay} onPress={() => setShowDevMenu(false)} />
                <View style={[styles.devMenu, { top: insets.top + 44 }]}>
                  <View style={styles.devMenuHeader}>
                    <Text style={styles.devMenuHeaderTitle}>Onboarding</Text>
                    <Text style={styles.devMenuHeaderSubtitle}>Developer tools</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      resetOnboardingAnswers();
                      startFlow();
                      setShowDevMenu(false);
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="refresh" size={16} color={colors.textPrimary} />
                      <Text style={styles.devMenuItemLabel}>Restart onboarding</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      resetOnboardingAnswers();
                      requestDevAutoCompleteToAvatar();
                      startFlow();
                      setShowDevMenu(false);
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="refresh" size={16} color={colors.textPrimary} />
                      <Text style={styles.devMenuItemLabel}>Autofill and skip to last step</Text>
                    </View>
                  </Pressable>
                  <View style={styles.devMenuSeparator} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setShowDevMenu(false);
                      capture(AnalyticsEvent.FtueDismissed, {
                        source: 'dev_menu',
                      });
                      dismissFlow();
                    }}
                    style={({ pressed }) => [
                      styles.devMenuItem,
                      pressed && styles.devMenuItemPressed,
                    ]}
                  >
                    <View style={styles.devMenuItemContent}>
                      <Icon name="close" size={16} color={colors.destructive} />
                      <Text style={styles.devMenuDestructiveLabel}>Exit onboarding</Text>
                    </View>
                  </Pressable>
                </View>
              </>
            )}
          </>
        )}
        {!showWorkflow && renderFtueInterstitial()}
        {showWorkflow && (
          // Subtle scale + fade in for the workflow host after the final
          // interstitial completes.
          <Animated.View
            style={{
              flex: 1,
              opacity: workflowAnim,
              transform: [
                {
                  scale: workflowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            }}
          >
            <AppShell>
              <AgentWorkspace
                key={workspaceKey}
                mode={onboardingWorkflow.mode}
                launchContext={{
                  source: 'firstTimeAppOpen',
                  intent: 'firstTimeOnboarding',
                }}
                workflowDefinitionId={onboardingWorkflow.workflowDefinitionId}
                workflowInstanceId={workspaceKey}
                onComplete={() => {
                  completeFlow();
                  dismissFlow();
                  setHasCompletedFirstTimeOnboarding(true);
                  const { lastOnboardingArcId: arcId, lastOnboardingGoalId: goalId } =
                    useAppStore.getState();

                  capture(AnalyticsEvent.FtueCompleted, {
                    trigger_count: triggerCount,
                    created_arc: Boolean(arcId),
                    created_goal: Boolean(goalId),
                  });

                  const navigateToOutcome = (attempt = 0) => {
                    if (!rootNavigationRef.isReady()) {
                      if (attempt < 25) {
                        setTimeout(() => navigateToOutcome(attempt + 1), 50);
                      }
                      return;
                    }

                    if (arcId) {
                      rootNavigationRef.navigate('ArcsStack', {
                        screen: 'ArcDetail',
                        params: {
                          arcId,
                          showFirstArcCelebration: true,
                        },
                      });
                      return;
                    }

                    if (goalId) {
                      rootNavigationRef.navigate('ArcsStack', {
                        screen: 'GoalDetail',
                        params: { goalId, entryPoint: 'arcsStack' },
                      });
                      return;
                    }

                    rootNavigationRef.navigate('ArcsStack', { screen: 'ArcsList' });
                  };

                  navigateToOutcome();
                }}
              />
            </AppShell>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  ftueInterstitialHost: {
    // Remove default interstitial padding so our footer can sit tight to the safe area.
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  ftueInterstitialContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  ftueLayout: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ftueHeaderBlock: {
    paddingTop: spacing.xl,
    rowGap: spacing.md,
  },
  ftueIllustrationCenter: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ftueProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ftueEyebrow: {
    ...typography.label,
  },
  ftueProgressLabel: {
    ...typography.label,
  },
  ftueProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  ftueProgressFill: {
    height: 6,
    borderRadius: 999,
  },
  ftueTitle: {
    ...typography.titleSm,
  },
  ftueBody: {
    ...typography.body,
  },
  ftueBodyEmphasis: {
    // Important: nested `Text` defaults to `bodySm`, so re-apply `body`
    // to keep sizing consistent, then increase weight for emphasis.
    ...typography.body,
    fontFamily: typography.titleSm.fontFamily,
  },
  ftueFooterCopy: {
    marginBottom: spacing.xs,
  },
  ftuePermissionHint: {
    ...typography.bodySm,
    opacity: 0.78,
    marginTop: spacing.xs,
  },
  ftueError: {
    ...typography.bodySm,
    opacity: 0.85,
  },
  ftueFooter: {
    paddingTop: 0,
    rowGap: spacing.sm,
  },
  ftuePrimaryButton: {
    // Color is provided per-step.
  },
  ftuePrimaryButtonLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  ftueSecondaryButtonLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  ftuePrimarySlot: {},
  ftueSecondarySlot: {},
  ftueSecondaryPlaceholder: {
    minHeight: 44,
  },
  devExitRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  devExitButton: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  devMenu: {
    position: 'absolute',
    right: 12,
    borderRadius: 8,
    backgroundColor: colors.canvas,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 224,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 2,
  },
  devMenuHeader: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  devMenuHeaderTitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  devMenuHeaderSubtitle: {
    ...typography.bodySm,
    color: colors.muted,
  },
  devMenuItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 6,
    minHeight: 44,
  },
  devMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  devMenuItemPressed: {
    backgroundColor: colors.shell,
  },
  devMenuItemLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  devMenuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    marginHorizontal: 0,
  },
  devMenuDestructiveLabel: {
    ...typography.body,
    color: colors.destructive,
  },
});


