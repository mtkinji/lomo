import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  type AppStateStatus,
  BackHandler,
  Easing,
  Image,
  Linking,
  Modal,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/primitives';
import { FullScreenInterstitial } from '../../ui/FullScreenInterstitial';
import { NotificationService } from '../../services/NotificationService';
import { LocationPermissionService } from '../../services/LocationPermissionService';
import {
  DEFAULT_DAILY_FOCUS_TIME,
  DEFAULT_DAILY_SHOW_UP_TIME,
  DEFAULT_GOAL_NUDGE_TIME,
} from '../../services/notifications/defaultTimes';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

interface ReturningUserPermissionsFlowProps {
  visible: boolean;
  onComplete: () => void;
}

/**
 * Simplified onboarding flow for returning users who reinstall the app.
 * Shows only the notifications/location permissions step, then completes.
 */
export function ReturningUserPermissionsFlow({
  visible,
  onComplete,
}: ReturningUserPermissionsFlowProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const notificationPreferences = useAppStore((state) => state.notificationPreferences);
  const setLocationOfferPreferences = useAppStore((state) => state.setLocationOfferPreferences);
  const locationOfferPreferences = useAppStore((state) => state.locationOfferPreferences);
  const setHasCompletedFirstTimeOnboarding = useAppStore(
    (state) => state.setHasCompletedFirstTimeOnboarding
  );
  const [isRequestingNotifications, setIsRequestingNotifications] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const { capture } = useAnalytics();
  const introAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    introAnim.setValue(0);
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, introAnim]);

  useEffect(() => {
    if (!visible) return;
    void NotificationService.syncOsPermissionStatus();
    void LocationPermissionService.syncOsPermissionStatus();
  }, [visible]);

  // Backstop: if the user bounces to Settings (or permissions get into a weird state),
  // ensure we never leave the CTA stuck in an "Enabling…" state.
  useEffect(() => {
    if (!visible) return;
    const handler = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      setIsRequestingNotifications(false);
      setIsRequestingLocation(false);
      void NotificationService.syncOsPermissionStatus();
      void LocationPermissionService.syncOsPermissionStatus();
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [visible]);

  const requestNotifications = useCallback(async () => {
    if (isRequestingNotifications) return;
    setIsRequestingNotifications(true);
    capture(AnalyticsEvent.NotificationsPermissionPrompted, { source: 'returning_user_flow' });
    try {
      const granted = await NotificationService.requestOsPermission();
      const updatedStatus = useAppStore.getState().notificationPreferences.osPermissionStatus;
      capture(AnalyticsEvent.NotificationsPermissionResult, {
        source: 'returning_user_flow',
        granted,
        os_permission_status: updatedStatus,
      });

      if (granted) {
        const currentPrefs = useAppStore.getState().notificationPreferences;
        const next = {
          ...currentPrefs,
          notificationsEnabled: true,
          allowDailyShowUp: true,
          dailyShowUpTime: currentPrefs.dailyShowUpTime ?? DEFAULT_DAILY_SHOW_UP_TIME,
          allowDailyFocus: true,
          dailyFocusTime: currentPrefs.dailyFocusTime ?? DEFAULT_DAILY_FOCUS_TIME,
          dailyFocusTimeMode: currentPrefs.dailyFocusTimeMode ?? 'auto',
          goalNudgeTime: (currentPrefs as any).goalNudgeTime ?? DEFAULT_GOAL_NUDGE_TIME,
          allowActivityReminders: true,
        };
        await NotificationService.applySettings(next);
      }
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[returning-user] notifications enable failed', err);
      }
    } finally {
      setIsRequestingNotifications(false);
    }
  }, [capture, isRequestingNotifications]);

  const requestLocation = useCallback(async () => {
    if (isRequestingLocation) return;
    setLocationOfferPreferences((current) => ({ ...current, enabled: true }));
    setIsRequestingLocation(true);
    try {
      await LocationPermissionService.ensurePermissionWithRationale('ftue');
    } finally {
      setIsRequestingLocation(false);
    }
  }, [isRequestingLocation, setLocationOfferPreferences]);

  const handleComplete = useCallback(() => {
    setHasCompletedFirstTimeOnboarding(true);
    capture(AnalyticsEvent.FtueCompleted, {
      trigger_count: 1,
      created_arc: false,
      created_goal: false,
      returning_user: true,
    });
    onComplete();
  }, [capture, onComplete, setHasCompletedFirstTimeOnboarding]);

  if (!visible) return null;

  const illustrationSource = require('../../../assets/illustrations/notifications.png');
  const illustrationSlotHeight = Math.round(Math.min(320, windowHeight * 0.42));
  const baseIllustrationWidth = Math.min(340, windowWidth - spacing.xl * 2);
  const illustrationWidth = Math.min(
    windowWidth - spacing.xl * 2,
    Math.round(baseIllustrationWidth * 1.12)
  );
  const illustrationHeight = Math.min(illustrationSlotHeight, Math.round(illustrationWidth * 0.78));

  const notificationStatus = notificationPreferences.osPermissionStatus;
  const locationStatus = locationOfferPreferences.osPermissionStatus;
  const notificationsAuthorized = notificationStatus === 'authorized';
  const notificationsBlocked = notificationStatus === 'denied' || notificationStatus === 'restricted';
  const locationAuthorized = locationStatus === 'authorized';
  const locationBlocked = locationStatus === 'denied' || locationStatus === 'restricted';
  const locationUnavailable = locationStatus === 'unavailable';

  const anyBlocked = notificationsBlocked || locationBlocked;

  type PrimaryAction = 'enableNotifications' | 'enableLocation' | 'continue';
  const primaryAction: PrimaryAction =
    anyBlocked
      ? 'continue'
      : !notificationsAuthorized
        ? 'enableNotifications'
        : !locationAuthorized && !locationUnavailable
          ? 'enableLocation'
          : 'continue';

  const primaryCtaLabel =
    anyBlocked
      ? 'Continue to Kwilt'
      : primaryAction === 'enableNotifications'
        ? 'Enable notifications'
        : primaryAction === 'enableLocation'
          ? 'Enable location'
          : 'Continue to Kwilt';

  const translateX = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <FullScreenInterstitial
        visible
        backgroundColor="turmeric300"
        progression="button"
        withinModal
        contentStyle={styles.interstitialHost}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: introAnim,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.layout}>
            <View style={[styles.headerBlock, { paddingTop: insets.top + spacing.xl }]}>
              <Text style={styles.eyebrow}>Welcome back</Text>
              <Text style={styles.title}>Setup your device</Text>
              <Text style={styles.body}>
                Enable notifications and location to get gentle reminders and location-based nudges
                on this device.
              </Text>
            </View>

            <View style={[styles.illustrationCenter, { minHeight: illustrationSlotHeight }]}>
              <Image
                source={illustrationSource as number}
                style={{
                  width: illustrationWidth,
                  height: illustrationHeight,
                }}
                resizeMode="contain"
                accessibilityLabel="Permissions illustration"
              />
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xs }]}>
              <View style={styles.permissionPanel}>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Notifications</Text>
                  <Text style={styles.permissionValue}>
                    {notificationsAuthorized ? 'Enabled' : notificationsBlocked ? 'Blocked' : 'Not enabled'}
                  </Text>
                </View>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Location (Always)</Text>
                  <Text style={styles.permissionValue}>
                    {locationAuthorized
                      ? 'Enabled'
                      : locationUnavailable
                        ? 'Unavailable'
                        : locationBlocked
                          ? 'Blocked'
                          : 'Not enabled'}
                  </Text>
                </View>
              </View>

              <Button
                variant="accent"
                fullWidth
                disabled={isRequestingNotifications || isRequestingLocation}
                style={styles.primaryButton}
                onPress={() => {
                  if (primaryAction === 'enableNotifications') {
                    void requestNotifications();
                    return;
                  }
                  if (primaryAction === 'enableLocation') {
                    void requestLocation();
                    return;
                  }
                  handleComplete();
                }}
              >
                <Text style={styles.primaryButtonLabel}>
                  {isRequestingNotifications || isRequestingLocation
                    ? 'Enabling…'
                    : primaryCtaLabel}
                </Text>
              </Button>

              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  if (anyBlocked) {
                    void Linking.openSettings();
                    return;
                  }
                  handleComplete();
                }}
              >
                <Text style={styles.secondaryButtonLabel}>{anyBlocked ? 'Open settings' : 'Skip for now'}</Text>
              </Button>
            </View>
          </View>
        </Animated.View>
      </FullScreenInterstitial>
    </Modal>
  );
}

const styles = StyleSheet.create({
  interstitialHost: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  layout: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerBlock: {
    rowGap: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    color: colors.sumi,
    opacity: 0.72,
  },
  title: {
    ...typography.titleSm,
    color: colors.sumi,
  },
  body: {
    ...typography.body,
    color: colors.sumi,
    opacity: 0.85,
  },
  illustrationCenter: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    rowGap: spacing.sm,
  },
  permissionPanel: {
    marginBottom: spacing.sm,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.22)',
    rowGap: spacing.xs,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  permissionLabel: {
    ...typography.bodySm,
    color: colors.sumi,
    opacity: 0.82,
  },
  permissionValue: {
    ...typography.bodySm,
    color: colors.sumi,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: colors.sumi,
    borderColor: colors.sumi,
  },
  primaryButtonLabel: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: '600',
  },
  secondaryButtonLabel: {
    ...typography.body,
    color: colors.sumi,
    fontWeight: '600',
  },
});

